#!/bin/bash
# 3 independent joint-grading votes (seeds 1,2,3). Usage: grade3.sh <work dir> <prep dir>
set -u
W=$1; PREP=$2
cd <REPO>
export PE_BENCH_CLAUDE=<RUNS>/2026-10-22/r6w/ev/grader-wrapper.sh PE_BENCH_WORK_DIR=$W PE_BENCH_TASKS=$PREP/tasks.json PE_BENCH_COST_FILE=<RUNS>/2026-10-22/product-engineer-r6-cost.tsv
for v in 1 2 3; do
  rm -rf "$W/grades"
  PE_BENCH_SEED=$v node bench/head-to-head/grade.mjs --joint --tasks X1,X2,X3,X4,X5 --runs-dir "$W/runs" --force
  echo "vote $v exit $?"
  rm -rf "$W/grades-vote-$v"; mv "$W/grades" "$W/grades-vote-$v"
done
touch "$W/GRADED"
