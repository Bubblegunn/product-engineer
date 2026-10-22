#!/bin/bash
# rerun.sh [--dry-run] [--model claude-sonnet-5-5] [--reps 3] [--name round-1]
# One command for a round: fetch-arms.sh, runall.sh, grade.mjs, publish.sh. Stops at the first failing step and
# publishes nothing after it. --dry-run prints the steps and changes nothing. With --reps 1 the summary needs one
# scored run per cell (--min-runs 1); with 3 it needs three.
# The model is passed as PE_BENCH_MODEL. Any value is accepted. Unless PE_BENCH_WORK_DIR is set, a model other than
# the default (claude-sonnet-5-5) gets its own work directory, ${TMPDIR:-/tmp}/pe-bench/work-<model>, so two models
# never mix runs in one directory. The default is the full model id, not the sonnet alias, which can 404 under a
# throw-away HOME.
# Bash 3 compatible.
set -e

HERE=$(cd "$(dirname "$0")" && pwd -P)
MODEL=claude-sonnet-5-5
REPS=3
MIN_RUNS=3
NAME=round-1
DRY_RUN=0

usage() {
  echo "usage: rerun.sh [--dry-run] [--model claude-sonnet-5-5] [--reps 3] [--name round-1]" >&2
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --model) [ $# -ge 2 ] || usage; MODEL=$2; shift 2 ;;
    --reps) [ $# -ge 2 ] || usage; REPS=$2; shift 2 ;;
    --name) [ $# -ge 2 ] || usage; NAME=$2; shift 2 ;;
    *) usage ;;
  esac
done

case "$REPS" in
  1|2|3) ;;
  *) echo "rerun.sh: --reps must be 1, 2 or 3" >&2; exit 2 ;;
esac
if [ "$REPS" = 1 ]; then MIN_RUNS=1; fi
case "$MODEL" in
  ""|*[!A-Za-z0-9._-]*) echo "rerun.sh: --model must be letters, digits, dot, dash or underscore" >&2; exit 2 ;;
esac
case "$NAME" in
  ""|.*|*/*|*[!A-Za-z0-9._-]*) echo "rerun.sh: --name must be letters, digits, dot, dash or underscore" >&2; exit 2 ;;
esac

if [ -n "${PE_BENCH_WORK_DIR:-}" ]; then
  WORK_DIR=$PE_BENCH_WORK_DIR
elif [ "$MODEL" = claude-sonnet-5-5 ]; then
  WORK_DIR=${TMPDIR:-/tmp}/pe-bench/work
else
  WORK_DIR=${TMPDIR:-/tmp}/pe-bench/work-$MODEL
fi
export PE_BENCH_MODEL=$MODEL
export PE_BENCH_WORK_DIR=$WORK_DIR

STEP_NAMES=(fetch-arms.sh runall.sh grade.mjs publish.sh)

# run_step <n>: runs step n. Each step is one command, with its arguments quoted, so a path with a space still works.
run_step() {
  case "$1" in
    1) bash "$HERE/fetch-arms.sh" ;;
    2) bash "$HERE/runall.sh" --reps "$REPS" ;;
    3) node "$HERE/grade.mjs" ;;
    4) bash "$HERE/publish.sh" "$NAME" --min-runs "$MIN_RUNS" ;;
  esac
}

show_step() {
  case "$1" in
    1) echo "bash $HERE/fetch-arms.sh" ;;
    2) echo "bash $HERE/runall.sh --reps $REPS" ;;
    3) echo "node $HERE/grade.mjs" ;;
    4) echo "bash $HERE/publish.sh $NAME --min-runs $MIN_RUNS" ;;
  esac
}

if [ "$DRY_RUN" = 1 ]; then
  echo "rerun: model $MODEL, reps $REPS, name $NAME"
  echo "work directory: $WORK_DIR"
  for n in 1 2 3 4; do
    echo "step $n (${STEP_NAMES[$((n - 1))]}): PE_BENCH_MODEL=$MODEL PE_BENCH_WORK_DIR=$WORK_DIR $(show_step "$n")"
  done
  exit 0
fi

for n in 1 2 3 4; do
  echo "rerun.sh: step $n of 4: ${STEP_NAMES[$((n - 1))]}"
  if ! run_step "$n"; then
    echo "rerun.sh: step $n (${STEP_NAMES[$((n - 1))]}) failed, nothing after it ran" >&2
    exit 1
  fi
done
echo "rerun.sh: round $NAME done"
