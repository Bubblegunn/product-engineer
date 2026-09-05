#!/bin/sh
# Copies the product-engineer commit-msg hook into the current repository.
set -eu
root=$(git rev-parse --show-toplevel)
src=$(dirname "$0")/commit-msg
cp "$src" "$root/.git/hooks/commit-msg"
chmod +x "$root/.git/hooks/commit-msg"
echo "installed $root/.git/hooks/commit-msg"
