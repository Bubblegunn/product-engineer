#!/bin/bash
# publish.sh <name>: copies one finished round from the work directory into results/<name>/, so that anyone can
# audit and re-grade it. Per DONE run: out.jsonl, stderr.log, meta.json, final-state.txt and any output file the task names
# (PR.md, RELEASE_NOTES.md). The grades directory (grade and prompt files, and the anonymous label map), the
# task, arm and criterion label files as they are now, and SUMMARY.md from summarize.mjs --markdown.
# The run repository is never copied. Refuses an existing name, and removes its output if it fails partway.
# Usage: publish.sh <name> [--min-runs N]
# --min-runs N is passed to summarize.mjs (default 3); rerun.sh passes 1 for a one-run round.
# Env:
#   PE_BENCH_WORK_DIR      work directory (default: ${TMPDIR:-/tmp}/pe-bench/work)
#   PE_BENCH_RESULTS_DIR   results directory (default: results next to this script, committed on purpose)
#   PE_BENCH_REAL_CLAUDE_JSON  the real .claude.json whose account address is scrubbed (default $REAL_HOME/.claude.json)
# The owner's account address is replaced with user@example.com in every text file of the round, before the Gmail
# check. Bash 3 compatible.
set -e
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE

HERE=$(cd "$(dirname "$0")" && pwd -P)
WORK_DIR=${PE_BENCH_WORK_DIR:-${TMPDIR:-/tmp}/pe-bench/work}
RESULTS_ROOT=${PE_BENCH_RESULTS_DIR:-$HERE/results}
. "$HERE/owner-email.sh"

if [ $# -lt 1 ]; then
  echo "usage: publish.sh <name> [--min-runs N]" >&2
  exit 2
fi
NAME=$1
shift
MIN_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --min-runs)
      case "${2-}" in
        ""|*[!0-9]*|0) echo "publish.sh: --min-runs needs a whole number of 1 or more" >&2; exit 2 ;;
      esac
      MIN_ARGS=(--min-runs "$2")
      shift 2
      ;;
    *) echo "usage: publish.sh <name> [--min-runs N]" >&2; exit 2 ;;
  esac
done
case "$NAME" in
  ""|.*|*/*|*[!A-Za-z0-9._-]*) echo "publish.sh: name must be letters, digits, dot, dash or underscore, and not start with a dot: $NAME" >&2; exit 2 ;;
esac

if [ ! -d "$WORK_DIR/runs" ] || [ ! -d "$WORK_DIR/grades" ]; then
  echo "publish.sh: $WORK_DIR needs runs/ and grades/, run runall.sh and grade.mjs first" >&2
  exit 1
fi

# Read the owner's address before anything is written. An unreadable real .claude.json stops the publish here, because
# the address could not be scrubbed.
OWNER_EMAIL=$(owner_email) || {
  echo "publish.sh: cannot read the owner account file, nothing published" >&2
  exit 1
}

mkdir -p "$RESULTS_ROOT"
OUT="$RESULTS_ROOT/$NAME"
if [ -e "$OUT" ]; then
  echo "publish.sh: $OUT already exists, choose another name" >&2
  exit 1
fi
mkdir "$OUT"
# Any failure below removes the partial output, so a refused or broken publish leaves nothing behind.
trap 'status=$?; if [ "$status" -ne 0 ]; then rm -rf "$OUT"; fi; exit $status' EXIT

# Output files a task names in its prompt, such as PR.md or RELEASE_NOTES.md.
named_outputs() {
  node -e '
const fs = require("fs");
const tasks = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const task = tasks[process.argv[2]];
const names = new Set(((task && task.prompt) || "").match(/\b[A-Za-z_]+\.md\b/g) || []);
for (const n of names) console.log(n);
' "$HERE/tasks.json" "$1"
}

COPIED=0
for dir in "$WORK_DIR"/runs/*/; do
  [ -d "$dir" ] || continue
  id=$(basename "$dir")
  [ -e "$dir/DONE" ] || continue
  task=${id%%-*}
  dest="$OUT/runs/$id"
  mkdir -p "$dest"
  cp "$dir/out.jsonl" "$dest/out.jsonl"
  if [ -f "$dir/stderr.log" ]; then cp "$dir/stderr.log" "$dest/stderr.log"; fi
  cp "$dir/meta.json" "$dest/meta.json"
  repo="$dir/repo"
  {
    echo "== git log -3 --stat =="
    git -C "$repo" log -3 --stat
    echo "== git status --short =="
    git -C "$repo" status --short
  } > "$dest/final-state.txt"
  named_outputs "$task" | while read -r file; do
    if [ -f "$repo/$file" ]; then cp "$repo/$file" "$dest/$file"; fi
  done
  COPIED=$((COPIED + 1))
done
if [ "$COPIED" -eq 0 ]; then
  echo "publish.sh: no DONE runs in $WORK_DIR/runs" >&2
  exit 1
fi

cp -R "$WORK_DIR/grades" "$OUT/grades"
cp "$HERE/tasks.json" "$OUT/tasks.json"
cp "$HERE/arms.json" "$OUT/arms.json"
cp "$HERE/labels.json" "$OUT/labels.json"

set +e
PE_BENCH_WORK_DIR=$WORK_DIR node "$HERE/summarize.mjs" --runs-dir "$WORK_DIR/runs" --markdown "${MIN_ARGS[@]}" > "$OUT/SUMMARY.md"
SUMMARY_STATUS=$?
set -e
# summarize.mjs exits 1 for a failing verdict, which is still a publishable result. Any other failure is not.
if [ "$SUMMARY_STATUS" -ne 0 ] && [ "$SUMMARY_STATUS" -ne 1 ]; then
  echo "publish.sh: summarize.mjs failed with status $SUMMARY_STATUS" >&2
  exit 1
fi
if ! tail -n 1 "$OUT/SUMMARY.md" | grep -qE '^(PASS|FAIL|PARTIAL)'; then
  echo "publish.sh: SUMMARY.md has no verdict line" >&2
  exit 1
fi

# The owner's account address (the CLI puts it in the agent's context, so it can reach a transcript) becomes
# user@example.com in every text file of the round. This runs before the Gmail check, so the check still refuses any
# other Gmail or googlemail address. The address is passed through the environment and never printed or written.
if [ -n "$OWNER_EMAIL" ]; then
  PE_OWNER_EMAIL=$OWNER_EMAIL node "$HERE/owner-email.mjs" --scrub-tree "$OUT" || {
    echo "publish.sh: could not scrub the owner account address in $OUT" >&2
    exit 1
  }
fi

# Never publish a Gmail or googlemail address, in any letter case, wherever it appears in the round. This refuses;
# it does not scrub, because the address itself is the thing that must not leave the machine.
GMAIL_RE='[A-Za-z0-9._%+-]+@(gmail|googlemail)\.'
if grep -rIil -E "$GMAIL_RE" "$OUT" > /dev/null 2>&1; then
  echo "publish.sh: refusing to publish, a Gmail address appears in $OUT:" >&2
  grep -rIil -E "$GMAIL_RE" "$OUT" >&2 || true
  exit 1
fi

# A home prefix with no name after it (a space, or the end of the line) cannot be scrubbed safely: refuse.
if grep -rIlE '/(Users|home)/([[:space:]]|$)' "$OUT" > /dev/null 2>&1; then
  echo "publish.sh: refusing to publish, a /Users/ or /home/ path with no name in $OUT:" >&2
  grep -rIlE '/(Users|home)/([[:space:]]|$)' "$OUT" >&2 || true
  exit 1
fi

# Scrub the local machine out of the copies, in place. A home directory prefix (/Users/<name> or /home/<name>)
# becomes <home>. The login name, as a whole word, becomes <user>. A word that already sits inside <...> is left
# alone, so the rewrite never matches its own output and each pass only removes occurrences. Plain sed works on
# macOS and Linux; the copies are rewritten through a temporary file, not sed -i.
LOGIN=$(id -un)
ESC_LOGIN=$(printf '%s' "$LOGIN" | sed 's/[][\/.*^$]/\\&/g')
# A home path runs from /Users/ or /home/ to the next slash, quote, backslash or angle bracket, so a folder name with a
# space or a non-ASCII character is removed whole, not cut at its first unmatched character. Plain text such as
# "/Users/x and more" is scrubbed up to the next separator too: over-scrubbing is the safe direction.
HOME_NAME_RE='[^/"'"'"'\\<>]+'
scrub_file() {
  f=$1
  sed -E -e "s#/Users/$HOME_NAME_RE#<home>#g" -e "s#/home/$HOME_NAME_RE#<home>#g" "$f" > "$f.scrub"
  mv "$f.scrub" "$f"
  if [ -n "$ESC_LOGIN" ]; then
    while grep -E -q "(^|[^A-Za-z0-9_<])$ESC_LOGIN([^A-Za-z0-9_>]|\$)" "$f"; do
      sed -E "s/(^|[^A-Za-z0-9_<])$ESC_LOGIN([^A-Za-z0-9_>]|\$)/\\1<user>\\2/g" "$f" > "$f.scrub"
      mv "$f.scrub" "$f"
    done
  fi
}
# The file list is collected before the first rewrite, so the temporary .scrub files never enter it.
FILES=$(find "$OUT" -type f)
while IFS= read -r f; do
  scrub_file "$f"
done <<EOF_FILES
$FILES
EOF_FILES

# After the scrub, any home path left over is a refusal: a path the rewrite could not recognise must not publish.
if grep -rIlF -e '/Users/' -e '/home/' "$OUT" > /dev/null 2>&1; then
  echo "publish.sh: refusing to publish, a /Users/ or /home/ path remains in $OUT:" >&2
  grep -rIlF -e '/Users/' -e '/home/' "$OUT" >&2 || true
  exit 1
fi

echo "published $COPIED runs to $OUT"
