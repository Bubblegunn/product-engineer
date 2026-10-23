#!/bin/bash
# Extracts the sealed held-out set d (local branch heldout-2026-10-d) into a temporary folder and prepares the bench files from it,
# printing COUNTS ONLY (task and criterion counts and the folder paths). It never prints, lists or cats a task file.
# Usage: extract-d.sh <out dir>   (creates <out>/src, <out>/prep/tasks.json, <out>/prep/labels.json, <out>/HODIR)
set -eu
OUT=$1
REPO=$(cd "$(dirname "$0")/../../.." && pwd -P)
rm -rf "$OUT"; mkdir -p "$OUT/src" "$OUT/prep"
git -C "$REPO" archive heldout-2026-10-d | tar -x -C "$OUT/src"
# the folder that holds X<n>/fixture.sh (found by name pattern, nothing is read)
FIX=$(find "$OUT/src" -type f -name fixture.sh -path '*/X[0-9]*/fixture.sh' | head -1)
[ -n "$FIX" ] || { echo "no X*/fixture.sh found" >&2; exit 1; }
HO=$(dirname "$(dirname "$FIX")")
printf '%s\n' "$HO" > "$OUT/HODIR"
node "$REPO/bench/head-to-head/heldout-prep.mjs" "$HO" "$OUT/prep"
