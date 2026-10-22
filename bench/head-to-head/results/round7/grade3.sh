#!/bin/bash
# usage: grade3.sh <work dir> <prep dir> <tasks csv>
set -u
W=$1; PREP=$2; T=$3
cd <HOME>/Desktop/Open-Source/projelerim/product-engineer
export PE_BENCH_CLAUDE=$HOME/claude-kredi-runs/2026-10-23/r7w/grader-wrapper.sh PE_BENCH_WORK_DIR=$W PE_BENCH_TASKS=$PREP/tasks.json PE_BENCH_COST_FILE=$HOME/claude-kredi-runs/2026-10-22/product-engineer-r7-cost.tsv
for v in 1 2 3; do
  rm -rf "$W/grades"
  PE_BENCH_SEED=$v node bench/head-to-head/grade.mjs --joint --tasks $T --runs-dir "$W/runs" --force
  echo "vote $v exit $?"
  rm -rf "$W/grades-vote-$v"; mv "$W/grades" "$W/grades-vote-$v"
done
touch "$W/GRADED"
