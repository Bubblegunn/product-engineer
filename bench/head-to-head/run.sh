#!/bin/bash
# run.sh <task> <arm> <rep>: one head-to-head session. Builds the task's fixture, runs claude -p in it
# with the arm's plugin, and writes work/runs/<task>-<arm>-<rep>/ with repo/, out.jsonl, stderr.log, meta.json and DONE.
# Stderr is kept apart from out.jsonl. A run succeeds when claude exits 0 and the last line of out.jsonl that parses as
# {"type":"result"} is not an error; noise on stderr, or a non-JSON line after the result, does not fail it.
# Usage: run.sh T1..T6 or H1..H7 <arm from arms.json> 1..3
# Round 3: T3 is the pr3 fixture (round 2 used pr2). ours.sh writes <work>/shim-ours (the product-engineer command,
# for the ours arm's claude call only) and <work>/shim-dod (bash 5 and GNU find, first on PATH for dod and dod-invoked, before the probes).
# The ours arm runs from <work>/ours/<hash>/, an immutable git archive of PE_BENCH_OURS_COMMIT (or HEAD), never from the
# working tree; ours.sh refuses a work directory that holds another hash (see ours.sh).
# Env:
#   PE_BENCH_CLAUDE     claude binary (default: claude)
#   PE_BENCH_MODEL      model passed to --model (default: claude-sonnet-5-5, the full id, not an alias)
#   PE_BENCH_FORCE=1    rerun a run that already has DONE
#   PE_BENCH_TASKS      tasks file, read as .<task>.prompt (default: tasks.json next to this script)
#   PE_BENCH_ARMS_DIR   arms directory (default: arms next to this script)
#   PE_BENCH_WORK_DIR   work directory (default: ${TMPDIR:-/tmp}/pe-bench/work, outside the repository)
#   PE_BENCH_ARMS_JSON  arms file (default: arms.json next to this script; the tests use a copy with stub probes)
#   PE_BENCH_REPO_ROOT  repository whose commit the ours arm runs (default: the repository this script belongs to)
#   PE_BENCH_OURS_COMMIT  commit the ours arm runs (default: HEAD); used only when the work directory has no copy yet
# Prerequisites: an arm whose arms.json entry has "requires" runs each probe first, with sh -c in this environment.
# If one fails, claude is not called: the run writes FAILED (exit_status 0, reason "not run: ...") and meta.json with
# outcome "not-run", and exits 0. A not-run run counts as finished in runall.sh unless PE_BENCH_FORCE=1.
# Isolation: every claude call runs with HOME=<work dir>/home (built once by mkhome.sh), without CLAUDE_CONFIG_DIR or
# XDG_CONFIG_HOME from the caller, and with --settings
# <work dir>/settings.json. guard.sh check runs before and after each claude call; a changed real hooks or mcpServers
# writes <work dir>/STOP and this script exits 3, and it exits 3 at once while STOP is present.
# Bash 3 compatible.
set -e

HERE=$(cd "$(dirname "$0")" && pwd -P)
REPO=${PE_BENCH_REPO_ROOT:-$(cd "$HERE/../.." && pwd -P)}
ARMS_JSON=${PE_BENCH_ARMS_JSON:-$HERE/arms.json}
ARMS_DIR=${PE_BENCH_ARMS_DIR:-$HERE/arms}
WORK_DIR=${PE_BENCH_WORK_DIR:-${TMPDIR:-/tmp}/pe-bench/work}
TASKS_FILE=${PE_BENCH_TASKS:-$HERE/tasks.json}
CLAUDE_BIN=${PE_BENCH_CLAUDE:-claude}
MODEL=${PE_BENCH_MODEL:-claude-sonnet-5-5}

if [ $# -ne 3 ]; then
  echo "usage: run.sh <T1..T6|H1..H7> <arm> <1..3>" >&2
  exit 2
fi
TASK=$1
ARM=$2
REP=$3

case "$TASK" in
  T1) VARIANT=commit ;;
  T2) VARIANT=done ;;
  T3) VARIANT=pr3 ;;
  T4) VARIANT=notes ;;
  T5) VARIANT=perf ;;
  T6) VARIANT=refactor ;;
  H1) VARIANT=h1 ;;
  H2) VARIANT=h2 ;;
  H3) VARIANT=h3 ;;
  H4) VARIANT=h4 ;;
  H5) VARIANT=h5 ;;
  H6) VARIANT=h6 ;;
  H7) VARIANT=h7 ;;
  *) echo "run.sh: unknown task: $TASK" >&2; exit 2 ;;
esac
case "$REP" in
  1|2|3) ;;
  *) echo "run.sh: rep must be 1, 2 or 3" >&2; exit 2 ;;
esac

# arm_field <arm> <field>: prints one field of an arm in arms.json. Exits 3 for an unknown arm.
# An invoked arm (sameAs) inherits kind, repo, commit and exportPluginRoot from the arm it names; it never
# inherits promptPrefix or competitorOf.
arm_field() {
  node -e '
const fs = require("fs");
const arms = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const name = process.argv[2];
const field = process.argv[3];
if (!Object.prototype.hasOwnProperty.call(arms, name)) process.exit(3);
let v = arms[name][field];
const inherited = ["kind", "repo", "commit", "exportPluginRoot"];
if (v === undefined && arms[name].sameAs && inherited.includes(field)) v = arms[arms[name].sameAs][field];
if (v !== undefined) process.stdout.write(String(v));
' "$ARMS_JSON" "$1" "$2"
}

# write_meta: writes meta.json for this run from the variables run.sh has set. Used for a finished claude run and
# for a not-run marker.
write_meta() {
  node -e '
const fs = require("fs");
const [out, task, arm, rep, model, plugin, version, exported, started, ended, status, outcome, prefix, oursCommit] = process.argv.slice(1);
fs.writeFileSync(out, JSON.stringify({
  task, arm, rep: Number(rep), model, plugin_dir: plugin, claude_version: version,
  exported_root: exported, started_at: started, ended_at: ended,
  exit_status: Number(status), outcome, prompt_prefix: prefix,
  ours_commit: oursCommit === "" ? null : oursCommit,
}, null, 2) + "\n");
' "$RUN/meta.json" "$TASK" "$ARM" "$REP" "$MODEL" "$PLUGIN" "$CLAUDE_VERSION" "$EXPORTED" "$START" "$END" "$STATUS" "$OUTCOME" "$PREFIX" "$OURS_COMMIT"
}

# The reason written for a competitor whose prerequisites fail. Fixed text, as docs/HEAD-TO-HEAD.md quotes it.
NOT_RUN_REASON='not run: needs bash >= 4 and GNU find (this machine has bash 3.2 and BSD find); install bash and findutils to run it'

# requires_of <arm>: prints one "name<TAB>command" line per prerequisite probe of the arm, read from its own entry.
requires_of() {
  node -e '
const fs = require("fs");
const arms = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const name = process.argv[2];
if (!Object.prototype.hasOwnProperty.call(arms, name)) process.exit(3);
for (const probe of arms[name].requires || []) process.stdout.write(`${probe.name}\t${probe.command}\n`);
' "$ARMS_JSON" "$1"
}

if ! KIND=$(arm_field "$ARM" kind); then
  echo "run.sh: unknown arm: $ARM" >&2
  exit 2
fi
EXPORT_ROOT=$(arm_field "$ARM" exportPluginRoot)
# The arm whose plugin directory and set-up this run uses. For a plain arm it is the arm itself.
BASE_ARM=$(arm_field "$ARM" sameAs)
[ -n "$BASE_ARM" ] || BASE_ARM=$ARM
PREFIX=$(arm_field "$ARM" promptPrefix)

if [ "$KIND" = self ]; then
  PLUGIN=  # the copy of the commit under test, set below once ours.sh has built it
else
  if [ ! -d "$ARMS_DIR/$BASE_ARM" ]; then
    echo "run.sh: arm $BASE_ARM is not fetched, run fetch-arms.sh $BASE_ARM first" >&2
    exit 1
  fi
  PLUGIN=$(cd "$ARMS_DIR/$BASE_ARM" && pwd -P)
fi

# The invoked arm's sentence goes in front of the task prompt, separated by one space.
if ! PROMPT=$(node -e '
const fs = require("fs");
let tasks;
try {
  tasks = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
} catch (e) {
  process.exit(4);
}
const entry = tasks[process.argv[2]];
if (!entry || typeof entry.prompt !== "string" || entry.prompt === "") process.exit(3);
const prefix = process.argv[3] || "";
process.stdout.write(prefix === "" ? entry.prompt : `${prefix} ${entry.prompt}`);
' "$TASKS_FILE" "$TASK" "$PREFIX"); then
  echo "run.sh: no prompt for $TASK in $TASKS_FILE" >&2
  exit 1
fi

mkdir -p "$WORK_DIR"
WORK_DIR=$(cd "$WORK_DIR" && pwd -P)

GUARD="$HERE/guard.sh"
MKHOME="$HERE/mkhome.sh"
RUN_HOME="$WORK_DIR/home"
SETTINGS="$WORK_DIR/settings.json"
if [ -e "$WORK_DIR/STOP" ]; then
  echo "run.sh: STOP is set in $WORK_DIR, nothing runs until it is removed:" >&2
  cat "$WORK_DIR/STOP" >&2
  exit 3
fi
[ -f "$WORK_DIR/guard-baseline" ] || PE_BENCH_WORK_DIR="$WORK_DIR" bash "$GUARD" snapshot
[ -f "$RUN_HOME/.claude.json" ] || bash "$MKHOME" "$RUN_HOME"
[ -f "$SETTINGS" ] || printf '{"hooks":{}}\n' > "$SETTINGS"
# The ours arm runs from the copy that runall.sh recorded: this script never builds it (ours.sh --existing refuses a work
# directory without a record, and refuses a copy whose tree digest has changed). The copy's shim-ours, and shim-dod, are
# written by ours.sh. Every other arm gets no ours shim, only shim-dod (the dod arms) and its PATH is left as it was.
if [ "$KIND" = self ]; then
  OURS_DIR=$(bash "$HERE/ours.sh" "$WORK_DIR" "$REPO" "$ARMS_JSON" --existing)
  PLUGIN=$OURS_DIR
  OURS_COMMIT=$(sed -n 1p "$WORK_DIR/ours-commit.txt")
else
  bash "$HERE/shims.sh" "$WORK_DIR" "$ARMS_JSON" ""
  OURS_COMMIT=""
fi
# The PATH of the dod arms' prerequisite probes and of their claude call: shim-dod first. The fixture build (mk.sh), the guard
# and the other set-up keep the PATH they were given. The ours arm's claude call gets shim-ours first (its Bash tool runs
# product-engineer). Nothing is exported, so no other step sees these directories.
PROBE_PATH=$PATH
CLAUDE_PATH=$PATH
if [ "$BASE_ARM" = dod ]; then
  PROBE_PATH="$WORK_DIR/shim-dod:$PATH"
  CLAUDE_PATH="$WORK_DIR/shim-dod:$PATH"
fi
if [ "$(arm_field "$ARM" cli)" = true ]; then
  CLAUDE_PATH="$WORK_DIR/shim-ours:$PATH"
fi
# An arm with a "settings" object in arms.json gets its own --settings file: the shared one merged with that object.
# Other arms keep the shared file as it is.
# arm-settings.mjs writes the file only when it is missing or stale, atomically, and removes it for an arm without settings.
RUN_SETTINGS=$SETTINGS
node "$HERE/arm-settings.mjs" "$ARMS_JSON" "$ARM" "$SETTINGS" "$WORK_DIR/settings-$ARM.json"
if [ -f "$WORK_DIR/settings-$ARM.json" ]; then RUN_SETTINGS="$WORK_DIR/settings-$ARM.json"; fi
# guard_check: stops the whole bench (exit 3) when the real Claude settings changed since the snapshot.
guard_check() {
  PE_BENCH_WORK_DIR="$WORK_DIR" bash "$GUARD" check || exit 3
}

ID="$TASK-$ARM-$REP"
RUN="$WORK_DIR/runs/$ID"
if [ -e "$RUN/DONE" ] && [ "${PE_BENCH_FORCE:-}" != 1 ]; then
  echo "run.sh: $ID already has DONE, set PE_BENCH_FORCE=1 to rerun" >&2
  exit 1
fi
if [ -f "$RUN/FAILED" ] && [ -f "$RUN/meta.json" ] && grep -q '"outcome": "not-run"' "$RUN/meta.json" && [ "${PE_BENCH_FORCE:-}" != 1 ]; then
  echo "run.sh: $ID is already not run, set PE_BENCH_FORCE=1 to probe again" >&2
  exit 0
fi
rm -rf "$RUN"
mkdir -p "$RUN"

if [ "$EXPORT_ROOT" = true ]; then
  EXPORTED=yes
else
  EXPORTED=no
fi

# Prerequisite probes. Each runs with sh -c in this environment; a failure marks the run not run, and claude is not called.
MISSING=""
PROBE_LINES=$(requires_of "$BASE_ARM")
while IFS=$'\t' read -r probe_name probe_cmd; do
  [ -n "$probe_name" ] || continue
  if ! PATH="$PROBE_PATH" sh -c "$probe_cmd" < /dev/null > /dev/null 2>&1; then
    MISSING="${MISSING:+$MISSING, }$probe_name"
  fi
done <<PROBES
$PROBE_LINES
PROBES
if [ -n "$MISSING" ]; then
  echo "run.sh: $ID not run, prerequisite failed: $MISSING" >&2
  START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  END=$START
  CLAUDE_VERSION=not-called
  STATUS=0
  OUTCOME=not-run
  write_meta
  printf 'exit_status=0\nreason=%s\n' "$NOT_RUN_REASON" > "$RUN/FAILED"
  exit 0
fi

bash "$HERE/mk.sh" "$RUN/repo" "$VARIANT"

if [ "$BASE_ARM" = dod ]; then
  TEMPLATES="$PLUGIN/templates"
  for f in dod-guard.json.template DOD.md.template; do
    if [ ! -f "$TEMPLATES/$f" ]; then
      echo "run.sh: missing $TEMPLATES/$f" >&2
      exit 1
    fi
  done
  case "$TASK" in
    H*) PROJECT=orders-api ;;
    *) PROJECT=stayhub ;;
  esac
  sed -e 's/{{STRICTNESS}}/normal/g' -e 's/{{STACK}}/node/g' -e 's/{{TEST_RUNNER}}/node/g' \
    "$TEMPLATES/dod-guard.json.template" > "$RUN/repo/.dod-guard.json"
  sed -e "s/{{PROJECT_NAME}}/$PROJECT/g" "$TEMPLATES/DOD.md.template" > "$RUN/repo/DOD.md"
  for entry in .dod-guard.json DOD.md .dod-guard/; do
    grep -qxF "$entry" "$RUN/repo/.git/info/exclude" || printf '%s\n' "$entry" >> "$RUN/repo/.git/info/exclude"
  done
fi

guard_check
CLAUDE_VERSION=$(env -u CLAUDE_CONFIG_DIR -u XDG_CONFIG_HOME HOME="$RUN_HOME" "$CLAUDE_BIN" --version 2>/dev/null | head -n 1) || true
guard_check
[ -n "$CLAUDE_VERSION" ] || CLAUDE_VERSION=unknown

CLAUDE_ARGS=(-p "$PROMPT" --setting-sources project --settings "$RUN_SETTINGS" --plugin-dir "$PLUGIN" --model "$MODEL"
  --dangerously-skip-permissions --strict-mcp-config --output-format stream-json --verbose)

START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
guard_check
set +e
if [ "$EXPORTED" = yes ]; then
  (cd "$RUN/repo" && env -u CLAUDE_CONFIG_DIR -u XDG_CONFIG_HOME CLAUDE_PLUGIN_ROOT="$PLUGIN" HOME="$RUN_HOME" PATH="$CLAUDE_PATH" "$CLAUDE_BIN" "${CLAUDE_ARGS[@]}" < /dev/null) > "$RUN/out.jsonl" 2> "$RUN/stderr.log"
else
  (cd "$RUN/repo" && env -u CLAUDE_PLUGIN_ROOT -u CLAUDE_CONFIG_DIR -u XDG_CONFIG_HOME HOME="$RUN_HOME" PATH="$CLAUDE_PATH" "$CLAUDE_BIN" "${CLAUDE_ARGS[@]}" < /dev/null) > "$RUN/out.jsonl" 2> "$RUN/stderr.log"
fi
STATUS=$?
set -e
END=$(date -u +%Y-%m-%dT%H:%M:%SZ)
guard_check

# The last stream-json line that parses as a result event decides: it is an error when claude reports is_error.
LAST_LINE=$(node -e '
const fs = require("fs");
const lines = fs.readFileSync(process.argv[1], "utf8").split("\n").filter((l) => l.trim() !== "");
let result = null;
for (const line of lines) {
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch (e) {
    continue;
  }
  if (parsed && parsed.type === "result") result = parsed;
}
if (result === null) process.stdout.write("no result line");
else process.stdout.write(result.is_error === true ? "error result" : "ok");
' "$RUN/out.jsonl")

if [ "$STATUS" -ne 0 ]; then
  OUTCOME=failed
  REASON="claude exited $STATUS"
  EXIT_CODE=$STATUS
elif [ "$LAST_LINE" != ok ]; then
  OUTCOME=failed
  REASON="$LAST_LINE"
  EXIT_CODE=1
else
  OUTCOME=done
  REASON=""
  EXIT_CODE=0
fi

write_meta

if [ "$OUTCOME" = done ]; then
  : > "$RUN/DONE"
else
  printf 'exit_status=%s\nreason=%s\n' "$STATUS" "$REASON" > "$RUN/FAILED"
  echo "run.sh: $ID failed: $REASON" >&2
fi
exit "$EXIT_CODE"
