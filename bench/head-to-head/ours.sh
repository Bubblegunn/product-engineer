#!/bin/bash
# ours.sh <work dir> <repo root> <arms.json> [--refresh-ours | --existing]: the immutable copy of the commit under test that
# every "ours" arm runs from, and the path of the copy on stdout.
#   <work>/ours/<hash>/      git archive of one commit, read-only
#   <work>/ours-commit.txt   line 1: the full hash; line 2: "tree-sha256 <digest>" of the copy (ours-verify.mjs --digest)
#   <work>/shim-ours, shim-dod: written by shims.sh, the shim-ours into the copy (never into <repo root>)
# Modes:
#   default        reuse the recorded copy when there is one; otherwise build it and verify it. runall.sh runs this.
#                  With PE_BENCH_OURS_COMMIT set and different from the record, refuse (exit 2). Without it, the
#                  recorded hash is used, so a commit made later in the repository changes nothing.
#   --refresh-ours build a new copy of PE_BENCH_OURS_COMMIT (or HEAD) and rewrite the record.
#   --existing     run.sh's mode: never build. Without a record, refuse (exit 2) and say to run runall.sh first.
# Every reuse re-computes the tree digest and refuses (exit 2) when a file of the copy has changed.
# A new copy is verified before the record is written: ours-verify.mjs checks bin/check.mjs --version against the copy's
# package.json and the probes in arms.json "ours".probes (argument list, then the string that must appear in the output).
# A failed verification removes the copy and exits 2.
# Bash 3 compatible.
set -e
set -o pipefail

HERE=$(cd "$(dirname "$0")" && pwd -P)

usage() {
  echo "usage: ours.sh <work dir> <repo root> <arms.json> [--refresh-ours | --existing]" >&2
  exit 2
}

[ $# -eq 3 ] || [ $# -eq 4 ] || usage
WORK=$1
REPO=$2
ARMS_JSON=$3
MODE=default
if [ $# -eq 4 ]; then
  case "$4" in
    --refresh-ours) MODE=refresh ;;
    --existing) MODE=existing ;;
    *) usage ;;
  esac
fi

mkdir -p "$WORK"
WORK=$(cd "$WORK" && pwd -P)
RECORD="$WORK/ours-commit.txt"

# The copy is reused when a record exists and no refresh is asked for.
if [ -f "$RECORD" ] && [ "$MODE" != refresh ]; then
  RECORDED_HASH=$(sed -n 1p "$RECORD")
  RECORDED_TREE=$(sed -n 2p "$RECORD" | sed -n 's/^tree-sha256 //p')
  if [ -n "${PE_BENCH_OURS_COMMIT:-}" ]; then
    if ! WANTED=$(git -C "$REPO" rev-parse --verify --quiet "$PE_BENCH_OURS_COMMIT^{commit}"); then
      echo "ours.sh: cannot resolve PE_BENCH_OURS_COMMIT=$PE_BENCH_OURS_COMMIT to a commit in $REPO" >&2
      exit 2
    fi
    if [ "$WANTED" != "$RECORDED_HASH" ]; then
      echo "ours.sh: $RECORD records $RECORDED_HASH, but PE_BENCH_OURS_COMMIT asks for $WANTED." >&2
      echo "ours.sh: a round must not mix two commits. Unset PE_BENCH_OURS_COMMIT, or pass --refresh-ours to start a new copy." >&2
      exit 2
    fi
  fi
  DIR="$WORK/ours/$RECORDED_HASH"
  if [ ! -d "$DIR" ]; then
    echo "ours.sh: the recorded copy $DIR is missing; pass --refresh-ours to build it again" >&2
    exit 2
  fi
  ACTUAL_TREE=$(node "$HERE/ours-verify.mjs" --digest "$DIR")
  if [ "$ACTUAL_TREE" != "$RECORDED_TREE" ]; then
    echo "ours.sh: the tree digest of $DIR is $ACTUAL_TREE, the record says $RECORDED_TREE: the copy has changed" >&2
    exit 2
  fi
  bash "$HERE/shims.sh" "$WORK" "$ARMS_JSON" "$DIR"
  echo "$DIR"
  exit 0
fi

if [ "$MODE" = existing ]; then
  echo "ours.sh: no copy of the commit under test in $WORK; run runall.sh first (it builds the immutable copy)" >&2
  exit 2
fi

# Build a new copy of the requested commit (default HEAD). A refresh first forgets the old record, so a failed build
# leaves no record behind.
REQUESTED=${PE_BENCH_OURS_COMMIT:-HEAD}
if ! HASH=$(git -C "$REPO" rev-parse --verify --quiet "$REQUESTED^{commit}"); then
  echo "ours.sh: cannot resolve $REQUESTED to a commit in $REPO" >&2
  exit 2
fi
DIR="$WORK/ours/$HASH"
rm -f "$RECORD"
if [ -d "$DIR" ]; then
  chmod -R u+w "$DIR"
  rm -rf "$DIR"
fi
mkdir -p "$DIR"
if ! git -C "$REPO" archive "$HASH" | tar -x -C "$DIR"; then
  chmod -R u+w "$DIR"
  rm -rf "$DIR"
  echo "ours.sh: git archive $HASH failed" >&2
  exit 2
fi
chmod -R a-w "$DIR"

bash "$HERE/shims.sh" "$WORK" "$ARMS_JSON" "$DIR"
if ! node "$HERE/ours-verify.mjs" "$DIR" "$WORK/shim-ours/product-engineer" "$ARMS_JSON"; then
  chmod -R u+w "$DIR"
  rm -rf "$DIR"
  echo "ours.sh: the copy of $HASH did not pass verification, nothing ran" >&2
  exit 2
fi

TREE=$(node "$HERE/ours-verify.mjs" --digest "$DIR")
TMP_RECORD="$RECORD.$$"
printf '%s\ntree-sha256 %s\n' "$HASH" "$TREE" > "$TMP_RECORD"
mv -f "$TMP_RECORD" "$RECORD"
echo "$DIR"
