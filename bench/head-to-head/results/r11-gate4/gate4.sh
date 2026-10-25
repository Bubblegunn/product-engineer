#!/bin/bash
# gate4.sh <ours commit>: the gate 4 matrix (12 tasks x 8 arms x 3 runs) into /private/tmp/pe-r11-gate4-work, one task at a time.
set -u
OC=$1
ARMS=ours,base,dod,dod-invoked,iso,iso-invoked,gwc,gwc-invoked
cd /Users/efe/Desktop/Open-Source/projelerim/product-engineer
SUB=/Users/efe/claude-kredi-runs/sub-shim
export PATH="$SUB:$(printf '%s' "$PATH" | tr ':' '\n' | grep -v 'sdk-shim' | paste -sd: -)"
export PE_BENCH_CLAUDE=/private/tmp/claude-wrap.sh PE_SECOND_EYE_CLAUDE=/private/tmp/claude-wrap.sh PE_BENCH_CLAUDE_REQUIRE="2.1.308 (Claude Code)" PE_BENCH_PAR=${PAR:-3} PE_BENCH_OURS_COMMIT=$OC PE_BENCH_WORK_DIR=/private/tmp/pe-r11-gate4-work PE_BENCH_TASKS=/private/tmp/pe-r11/gate4/prep/tasks.json PE_BENCH_HELDOUT_DIR=/private/tmp/pe-r11/gate4/tasks
W=$PE_BENCH_WORK_DIR; mkdir -p $W
for t in X111 X112 X113 X114 X121 X122 X123 X124 X131 X132 X133 X134; do
  bash bench/head-to-head/runall.sh --tasks $t --arms "$ARMS" --reps 3
  if grep -l -E 'session limit|weekly limit|hit your .*limit|"api_error_status":(429|401|403)' $W/runs/*/out.jsonl >/dev/null 2>&1; then echo "STOP limit"; touch $W/STOPPED; exit 4; fi
done
echo GATE4DONE
