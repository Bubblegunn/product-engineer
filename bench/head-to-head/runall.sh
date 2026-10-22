#!/bin/bash
# runall.sh [--dry-run] [--reset-guard] [--refresh-ours] [--tasks T1,T2] [--arms ours,base] [--reps 3]
# Runs the head-to-head matrix through run.sh, skipping every run that already has DONE (resumable).
# --dry-run prints the pending (task arm rep) triples and exits 0.
# Before the runs it builds the shared set-up once: <work>/home (mkhome.sh), <work>/settings.json and, when missing,
# the guard baseline of the real Claude settings (guard.sh snapshot). The baseline is kept across invocations, so a
# change made between two runall calls stops the second one with exit 3. --reset-guard deletes the baseline and STOP,
# then takes a fresh snapshot: use it only after deciding that the change is wanted.
# If a run finds the settings changed it writes <work>/STOP, the remaining runs exit at once, and runall exits 3.
# A run that is not run (a competitor whose prerequisites failed, see run.sh) is finished: it is skipped, and it is
# not a failed triple. PE_BENCH_FORCE=1 makes runall probe those again.
# The ours arm runs from <work>/ours/<hash>/, an immutable copy of PE_BENCH_OURS_COMMIT (default HEAD) built by ours.sh in
# the shared set-up. A work directory that holds a copy of another commit is refused (exit 2): a round never mixes two
# commits. --refresh-ours starts a new copy of the requested commit, for the start of a new round only.
# A copy that fails verification (--version, or a probe in arms.json "ours".probes) aborts the set-up with exit 2.
# PE_BENCH_ONLY_TASKS and PE_BENCH_ONLY_ARMS (comma lists) keep only those tasks and arms of the matrix, on top of --tasks and --arms.
# A name in them that is not a known task or arm is refused (exit 2). They change nothing else, --dry-run included.
# Env: PE_BENCH_PAR (parallel runs, default 3), PE_BENCH_ARMS_JSON (see run.sh), PE_BENCH_REPO_ROOT, PE_BENCH_OURS_COMMIT,
# and everything run.sh reads.
# Bash 3 compatible.
set -e

HERE=$(cd "$(dirname "$0")" && pwd -P)
ARMS_JSON=${PE_BENCH_ARMS_JSON:-$HERE/arms.json}
WORK_DIR=${PE_BENCH_WORK_DIR:-${TMPDIR:-/tmp}/pe-bench/work}
REPO=${PE_BENCH_REPO_ROOT:-$(cd "$HERE/../.." && pwd -P)}

# is_not_run <run dir>: true when the run is the not-run marker run.sh writes for a failed prerequisite.
is_not_run() {
  [ -f "$1/FAILED" ] && [ -f "$1/meta.json" ] && grep -q '"outcome": "not-run"' "$1/meta.json"
}

usage() {
  echo "usage: runall.sh [--dry-run] [--reset-guard] [--refresh-ours] [--tasks T1,T2] [--arms ours,base] [--reps 3]" >&2
  exit 2
}

DRY_RUN=0
RESET_GUARD=0
REFRESH_OURS=0
TASKS=T1,T2,T3,T4,T5,T6,H1,H2,H3,H4,H5,H6,H7
ALL_ARMS=$(node -e 'process.stdout.write(Object.keys(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))).join(","))' "$ARMS_JSON")
ARMS=$ALL_ARMS
REPS=3

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --reset-guard) RESET_GUARD=1; shift ;;
    --refresh-ours) REFRESH_OURS=1; shift ;;
    --tasks) [ $# -ge 2 ] || usage; TASKS=$2; shift 2 ;;
    --arms) [ $# -ge 2 ] || usage; ARMS=$2; shift 2 ;;
    --reps) [ $# -ge 2 ] || usage; REPS=$2; shift 2 ;;
    *) usage ;;
  esac
done

case "$REPS" in
  1|2|3) ;;
  *) echo "runall.sh: --reps must be 1, 2 or 3" >&2; exit 2 ;;
esac

IFS=, read -r -a TASK_RAW <<< "$TASKS"
IFS=, read -r -a ARM_RAW <<< "$ARMS"

# Drop repeats so that --arms ours,ours does not run the same triple twice in one directory.
TASK_LIST=()
for t in "${TASK_RAW[@]}"; do
  case " ${TASK_LIST[*]} " in
    *" $t "*) ;;
    *) TASK_LIST[${#TASK_LIST[@]}]=$t ;;
  esac
done
ARM_LIST=()
for a in "${ARM_RAW[@]}"; do
  case " ${ARM_LIST[*]} " in
    *" $a "*) ;;
    *) ARM_LIST[${#ARM_LIST[@]}]=$a ;;
  esac
done

for t in "${TASK_LIST[@]}"; do
  case "$t" in
    T1|T2|T3|T4|T5|T6|H1|H2|H3|H4|H5|H6|H7|X[0-9]*) ;;
    *) echo "runall.sh: unknown task: $t" >&2; exit 2 ;;
  esac
done
for a in "${ARM_LIST[@]}"; do
  case ",$ALL_ARMS," in
    *",$a,"*) ;;
    *) echo "runall.sh: unknown arm: $a" >&2; exit 2 ;;
  esac
done

# PE_BENCH_ONLY_TASKS / PE_BENCH_ONLY_ARMS: keep only the listed names. Every listed name must be known.
if [ -n "${PE_BENCH_ONLY_TASKS:-}" ]; then
  IFS=, read -r -a ONLY_T <<< "$PE_BENCH_ONLY_TASKS"
  for t in "${ONLY_T[@]}"; do
    case "$t" in
      T1|T2|T3|T4|T5|T6|H1|H2|H3|H4|H5|H6|H7|X[0-9]*) ;;
      *) echo "runall.sh: unknown task in PE_BENCH_ONLY_TASKS: $t" >&2; exit 2 ;;
    esac
  done
  KEEP=()
  for t in "${TASK_LIST[@]}"; do
    case ",$PE_BENCH_ONLY_TASKS," in
      *",$t,"*) KEEP[${#KEEP[@]}]=$t ;;
    esac
  done
  TASK_LIST=("${KEEP[@]}")
fi
if [ -n "${PE_BENCH_ONLY_ARMS:-}" ]; then
  IFS=, read -r -a ONLY_A <<< "$PE_BENCH_ONLY_ARMS"
  for a in "${ONLY_A[@]}"; do
    case ",$ALL_ARMS," in
      *",$a,"*) ;;
      *) echo "runall.sh: unknown arm in PE_BENCH_ONLY_ARMS: $a" >&2; exit 2 ;;
    esac
  done
  KEEP=()
  for a in "${ARM_LIST[@]}"; do
    case ",$PE_BENCH_ONLY_ARMS," in
      *",$a,"*) KEEP[${#KEEP[@]}]=$a ;;
    esac
  done
  ARM_LIST=("${KEEP[@]}")
fi

PENDING=()
TOTAL=0
SKIPPED=0
for t in "${TASK_LIST[@]}"; do
  for a in "${ARM_LIST[@]}"; do
    r=1
    while [ "$r" -le "$REPS" ]; do
      TOTAL=$((TOTAL + 1))
      # DONE is finished, and so is a not-run marker unless PE_BENCH_FORCE=1. A FAILED run has no DONE, so it is pending again.
      RUN_DIR="$WORK_DIR/runs/$t-$a-$r"
      if [ -e "$RUN_DIR/DONE" ] || { [ "${PE_BENCH_FORCE:-}" != 1 ] && is_not_run "$RUN_DIR"; }; then
        SKIPPED=$((SKIPPED + 1))
      else
        PENDING[${#PENDING[@]}]="$t $a $r"
      fi
      r=$((r + 1))
    done
  done
done

COUNT=${#PENDING[@]}
echo "work directory: $WORK_DIR"
echo "$COUNT runs to do, $SKIPPED already done, $TOTAL in the matrix"
echo "estimated cost: about \$$(awk "BEGIN { printf \"%.2f\", $COUNT * 0.06 }") (about \$0.06 per run)"

if [ "$DRY_RUN" = 1 ]; then
  for line in "${PENDING[@]}"; do
    echo "$line"
  done
  exit 0
fi

if [ "$RESET_GUARD" = 1 ]; then
  rm -f "$WORK_DIR/guard-baseline" "$WORK_DIR/STOP"
  echo "runall.sh: guard baseline and STOP reset, the settings are snapshotted again" >&2
fi
mkdir -p "$WORK_DIR"
# The shared set-up, built once before any run starts, so parallel runs never build it at the same time.
[ -f "$WORK_DIR/home/.claude.json" ] || bash "$HERE/mkhome.sh" "$WORK_DIR/home"
[ -f "$WORK_DIR/settings.json" ] || printf '{"hooks":{}}\n' > "$WORK_DIR/settings.json"
# The copy of the commit under test (verified before any run) and the PATH shims, which ours.sh writes into it. Built once.
OURS_ARGS=()
if [ "$REFRESH_OURS" = 1 ]; then OURS_ARGS=(--refresh-ours); fi
# The operator sees which commit the round measures: a copy reused from the record, or one built now.
HAD_RECORD=0; [ -f "$WORK_DIR/ours-commit.txt" ] && HAD_RECORD=1
bash "$HERE/ours.sh" "$WORK_DIR" "$REPO" "$ARMS_JSON" "${OURS_ARGS[@]}" > /dev/null
HOW=recorded; if [ "$REFRESH_OURS" = 1 ] || [ "$HAD_RECORD" = 0 ]; then HOW=built; fi
echo "ours: $(head -n 1 "$WORK_DIR/ours-commit.txt") ($HOW)" >&2
# One --settings file per arm that has settings in arms.json, built here so no run writes it while others read it.
IFS=, read -r -a SET_ARMS <<< "$ALL_ARMS"
for a in "${SET_ARMS[@]}"; do
  node "$HERE/arm-settings.mjs" "$ARMS_JSON" "$a" "$WORK_DIR/settings.json" "$WORK_DIR/settings-$a.json"
done
[ -f "$WORK_DIR/guard-baseline" ] || PE_BENCH_WORK_DIR=$WORK_DIR bash "$HERE/guard.sh" snapshot

if [ "$COUNT" -eq 0 ]; then
  exit 0
fi

XARGS_STATUS=0
set +e
for line in "${PENDING[@]}"; do
  echo "$line"
done | xargs -n 3 -P "${PE_BENCH_PAR:-3}" bash "$HERE/run.sh"
XARGS_STATUS=$?
set -e

if [ -e "$WORK_DIR/STOP" ]; then
  echo "runall.sh: stopped, the real Claude settings changed during the bench:" >&2
  cat "$WORK_DIR/STOP" >&2
  exit 3
fi

FAILED=()
for line in "${PENDING[@]}"; do
  set -- $line
  RUN_DIR="$WORK_DIR/runs/$1-$2-$3"
  if [ ! -e "$RUN_DIR/DONE" ] && ! is_not_run "$RUN_DIR"; then
    FAILED[${#FAILED[@]}]="$line"
  fi
done

if [ "${#FAILED[@]}" -gt 0 ]; then
  echo "failed triples (no DONE, rerun with runall.sh to retry them):"
  for line in "${FAILED[@]}"; do
    echo "$line"
  done
  exit 1
fi
if [ "$XARGS_STATUS" -ne 0 ]; then
  echo "runall.sh: xargs exited $XARGS_STATUS" >&2
  exit 1
fi
