#!/bin/bash
# Development-gate driver for round r9 (docs/DEV-GATE-r9.md). Usage: drive-dev.sh <work dir> <ours commit> <stage>
# stage 1: probe, X91 only, ours and base, 1 run each (hook-shape check before spending more).
# stage 2: X92 and X93 (then X91), ours and base, 3 runs (the "stop early if base is at the maximum" step; X91 saturated in the stage 1 probe).
# stage 3: everything else: all six tasks, arms ours,base,dod,dod-invoked (+gwc,gwc-invoked on X94 and X95), 3 runs.
# Subscription path: the sub-shim wrapper is first on PATH and is the claude binary. Parallelism 3.
# Stops at once on a usage/session limit, 429, authentication error or credit guard in any session (never grades a failed cell).
set -u
W=$1; OC=$2; STAGE=$3
HERE=$(cd "$(dirname "$0")" && pwd -P)
cd "$HERE/../../.."
SUB=/Users/efe/claude-kredi-runs/sub-shim
export PATH="$SUB:$(printf '%s' "$PATH" | tr ':' '\n' | grep -v 'sdk-shim' | paste -sd: -)"
export PE_BENCH_CLAUDE="$SUB/claude" PE_BENCH_CLAUDE_REQUIRE="2.1.308 (Claude Code)"
export PE_BENCH_WORK_DIR=$W PE_BENCH_PAR=3 PE_BENCH_OURS_COMMIT=$OC PE_BENCH_HELDOUT_DIR=$HERE PE_BENCH_TASKS=${PREP_DIR:-/tmp/dev-r9-prep}/tasks.json
bad() { grep -l -E 'credit guard|api_error_status.{0,4}(429|401|403)|authentication_error|rate_limit_error|usage limit|session limit|weekly limit|limit reached' "$W"/runs/*/stderr.log "$W"/runs/*/out.jsonl 2>/dev/null | head -3; }
run() { # run <tasks> <arms> <reps>
  bash bench/head-to-head/runall.sh --tasks "$1" --arms "$2" --reps "$3"
  b=$(bad); [ -z "$b" ] || { echo "STOP: limit/auth error seen in: $b"; touch "$W/STOPPED"; exit 4; }
}
echo "start $(date) stage=$STAGE"
case "$STAGE" in
  1) run X91 ours,base 1 ;;
  2) run X92,X93 ours,base 3
     run X91 ours,base 3 ;;
  3) run X91,X92 dod,dod-invoked 3
     run X93,X96 ours,base,dod,dod-invoked 3
     run X94,X95 ours,base,dod,dod-invoked,gwc,gwc-invoked 3
     run X93 ours,base 3 ;;
  *) echo "stage 1, 2 or 3" >&2; exit 2 ;;
esac
echo "done $(date)"; touch "$W/DRIVER_DONE_$STAGE"
