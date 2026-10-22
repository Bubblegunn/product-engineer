#!/bin/bash
# dev gate: ours x3 only. usage: devdrive.sh <name> <heldout dir> <prep dir> <commit> <tasks csv>
set -u
N=$1; HO=$2; PREP=$3; OC=$4; TASKS=$5
R=$HOME/claude-kredi-runs/2026-10-23/r7w; W=$R/dev-$N
cd <HOME>/Desktop/Open-Source/projelerim/product-engineer
export PE_BENCH_ONLY_ARMS=ours PE_BENCH_WORK_DIR=$W PE_BENCH_PAR=3 PE_BENCH_OURS_COMMIT=$OC PE_BENCH_HELDOUT_DIR=$HO PE_BENCH_TASKS=$PREP/tasks.json
for t in ${TASKS//,/ }; do bash bench/head-to-head/runall.sh --tasks $t; done
touch $W/DRIVER_DONE
