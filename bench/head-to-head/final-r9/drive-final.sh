#!/bin/bash
# Final-measurement session driver for r9 (docs/FINAL-PROTOCOL-r9.md). Usage: drive-final.sh public|d <prep dir for d> 
# Runs all 8 arms x 3 runs of the set through runall.sh on the subscription path. Stops at once on a limit/auth error.
set -u
SET=$1; PREP=${2:-}
HERE=$(cd "$(dirname "$0")" && pwd -P)
cd "$HERE/../../.."
SUB=/Users/efe/claude-kredi-runs/sub-shim
export PATH="$SUB:$(printf '%s' "$PATH" | tr ':' '\n' | grep -v 'sdk-shim' | paste -sd: -)"
export PE_BENCH_CLAUDE="$SUB/claude" PE_BENCH_CLAUDE_REQUIRE="2.1.308 (Claude Code)" PE_BENCH_PAR=3 PE_BENCH_OURS_COMMIT=e0f3d720b0e38d23b21541cedc965e373a5f7f49
ARMS=ours,base,dod,dod-invoked,iso,iso-invoked,gwc,gwc-invoked
W=/private/tmp/pe-r9-final-$SET
export PE_BENCH_WORK_DIR=$W
mkdir -p "$W"
bad() { grep -l -E 'credit guard|api_error_status.{0,4}(429|401|403)|authentication_error|rate_limit_error|usage limit|session limit|weekly limit|limit reached' "$W"/runs/*/stderr.log "$W"/runs/*/out.jsonl 2>/dev/null | head -3; }
echo "start $(date) set=$SET"
case "$SET" in
  public) unset PE_BENCH_TASKS PE_BENCH_HELDOUT_DIR
          TASKLIST=T1,T2,T3,T4,T5,T6,H1,H2,H3,H4,H5,H6,H7 ;;
  d) export PE_BENCH_TASKS=$PREP/prep/tasks.json PE_BENCH_HELDOUT_DIR=$(cat "$PREP/HODIR")
     TASKLIST=$(node -e 'process.stdout.write(Object.keys(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))).join(","))' "$PE_BENCH_TASKS") ;;
  *) echo "public|d" >&2; exit 2 ;;
esac
for t in $(echo "$TASKLIST" | tr ',' ' '); do
  bash bench/head-to-head/runall.sh --tasks "$t" --arms "$ARMS" --reps 3
  b=$(bad); [ -z "$b" ] || { echo "STOP: limit/auth error in: $b"; touch "$W/STOPPED"; exit 4; }
  echo "task $t done $(date)"
done
echo "done $(date)"; touch "$W/DRIVER_DONE"
