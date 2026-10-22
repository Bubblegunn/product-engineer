#!/bin/bash
# guard.sh snapshot|check: keeps the bench away from the real Claude settings.
#   snapshot  writes <work>/guard-baseline: a sha256 of the canonical JSON of the hooks object of the real
#             $REAL_HOME/.claude/settings.json, and of the mcpServers object of the real $REAL_HOME/.claude.json.
#   check     recomputes both. When one changed, or there is no snapshot, it prints the reason and exits 3.
#             A changed value also writes <work>/STOP, which makes every later run exit at once.
# Env: REAL_HOME (default $HOME), PE_BENCH_REAL_SETTINGS (default $REAL_HOME/.claude/settings.json),
#      PE_BENCH_REAL_CLAUDE_JSON (default $REAL_HOME/.claude.json), PE_BENCH_WORK_DIR (default ${TMPDIR:-/tmp}/pe-bench/work).
# Bash 3 compatible.
set -e

if [ $# -ne 1 ]; then
  echo "usage: guard.sh snapshot|check" >&2
  exit 2
fi
ACTION=$1
REAL_HOME=${REAL_HOME:-$HOME}
REAL_SETTINGS=${PE_BENCH_REAL_SETTINGS:-$REAL_HOME/.claude/settings.json}
REAL_CLAUDE_JSON=${PE_BENCH_REAL_CLAUDE_JSON:-$REAL_HOME/.claude.json}
WORK_DIR=${PE_BENCH_WORK_DIR:-${TMPDIR:-/tmp}/pe-bench/work}
BASELINE=$WORK_DIR/guard-baseline
STOP=$WORK_DIR/STOP

# digest <file> <key>: sha256 of the canonical JSON (sorted keys, no spaces) of one top-level key. A missing file or
# key counts as null. Exits non-zero when the file is not JSON, so a broken file never reads as unchanged.
digest() {
  node -e '
const fs = require("fs");
const crypto = require("crypto");
const [file, key] = process.argv.slice(1);
let value = null;
if (fs.existsSync(file)) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  value = json[key] === undefined ? null : json[key];
}
const canon = (v) =>
  Array.isArray(v)
    ? v.map(canon)
    : v !== null && typeof v === "object"
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
      : v;
process.stdout.write(crypto.createHash("sha256").update(JSON.stringify(canon(value))).digest("hex"));
' "$1" "$2"
}

mkdir -p "$WORK_DIR"
case "$ACTION" in
  snapshot)
    HOOKS=$(digest "$REAL_SETTINGS" hooks)
    MCP=$(digest "$REAL_CLAUDE_JSON" mcpServers)
    printf 'hooks=%s\nmcpServers=%s\n' "$HOOKS" "$MCP" > "$BASELINE"
    ;;
  check)
    if [ ! -f "$BASELINE" ]; then
      echo "guard: no snapshot in $BASELINE, run guard.sh snapshot first" >&2
      exit 3
    fi
    REASONS=""
    NOW_HOOKS=$(digest "$REAL_SETTINGS" hooks) || NOW_HOOKS=unreadable
    NOW_MCP=$(digest "$REAL_CLAUDE_JSON" mcpServers) || NOW_MCP=unreadable
    WAS_HOOKS=$(sed -n 's/^hooks=//p' "$BASELINE")
    WAS_MCP=$(sed -n 's/^mcpServers=//p' "$BASELINE")
    if [ "$NOW_HOOKS" != "$WAS_HOOKS" ]; then REASONS="hooks of $REAL_SETTINGS changed since the snapshot"; fi
    if [ "$NOW_MCP" != "$WAS_MCP" ]; then
      REASONS="${REASONS:+$REASONS; }mcpServers of $REAL_CLAUDE_JSON changed since the snapshot"
    fi
    if [ -n "$REASONS" ]; then
      echo "guard: $REASONS" >&2
      printf '%s\n' "$REASONS" > "$STOP"
      exit 3
    fi
    ;;
  *)
    echo "usage: guard.sh snapshot|check" >&2
    exit 2
    ;;
esac
