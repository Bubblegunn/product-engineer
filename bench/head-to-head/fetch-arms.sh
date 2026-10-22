#!/bin/bash
# Fetches the competitor arms pinned in arms.json into arms/<name>/ (git-ignored).
# Usage: fetch-arms.sh [arm ...]   (default: every arm in arms.json)
# Env:
#   PE_BENCH_ARMS_DIR  arms directory (default: arms next to this script)
#   PE_BENCH_ARMS_SRC  copy each git arm from <dir>/<name>/ instead of cloning (tests and offline use)
# Bash 3 compatible.
set -e

HERE=$(cd "$(dirname "$0")" && pwd -P)
ARMS_JSON="$HERE/arms.json"
ARMS_DIR=${PE_BENCH_ARMS_DIR:-$HERE/arms}
mkdir -p "$ARMS_DIR"
ARMS_DIR=$(cd "$ARMS_DIR" && pwd -P)

# One line per arm: name, kind, repo, commit. Missing fields are "-" so that tab splitting keeps the columns.
ROWS=$(node -e '
const fs = require("fs");
const arms = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
// An invoked arm (sameAs) is an alias: it runs the plugin of the arm it names, so it has nothing of its own to fetch.
for (const [name, a] of Object.entries(arms)) {
  if (a.sameAs) {
    console.log([name, "alias", a.sameAs, "-"].join("\t"));
    continue;
  }
  console.log([name, a.kind, a.repo || "-", a.commit || "-"].join("\t"));
}
' "$ARMS_JSON")

for want in "$@"; do
  if ! printf '%s\n' "$ROWS" | cut -f1 | grep -qx "$want"; then
    echo "fetch-arms.sh: unknown arm: $want" >&2
    exit 2
  fi
done

fetch_empty() {
  mkdir -p "$ARMS_DIR/$name/.claude-plugin"
  printf '%s\n' '{"name":"empty","version":"0.0.0","description":"empty plugin for the bare-model arm"}' \
    > "$ARMS_DIR/$name/.claude-plugin/plugin.json"
  echo "$name: empty plugin written"
}

fetch_git() {
  local dir="$ARMS_DIR/$name"
  if [ -n "${PE_BENCH_ARMS_SRC:-}" ]; then
    if [ -f "$dir/.h2h-commit" ] && [ "$(cat "$dir/.h2h-commit")" = "$commit" ]; then
      echo "$name: already at $commit"
      return 0
    fi
    if [ ! -d "$PE_BENCH_ARMS_SRC/$name" ]; then
      echo "$name: missing $PE_BENCH_ARMS_SRC/$name" >&2
      exit 1
    fi
    # rm -rf only touches arms/<name>, the git-ignored cache. Local edits made there are discarded by design.
    rm -rf "$dir"
    cp -R "$PE_BENCH_ARMS_SRC/$name" "$dir"
    printf '%s\n' "$commit" > "$dir/.h2h-commit"
    echo "$name: copied from $PE_BENCH_ARMS_SRC/$name, pinned $commit"
    return 0
  fi
  if [ -d "$dir/.git" ] && [ "$(git -C "$dir" rev-parse HEAD 2>/dev/null)" = "$commit" ]; then
    echo "$name: already at $commit"
    return 0
  fi
  # rm -rf only touches arms/<name>, the git-ignored cache. Local edits made there are discarded by design.
  rm -rf "$dir"
  git clone --quiet "$repo" "$dir"
  git -C "$dir" checkout --quiet "$commit"
  echo "$name: cloned, at $commit"
}

while IFS=$'\t' read -r name kind repo commit; do
  if [ $# -gt 0 ]; then
    case " $* " in
      *" $name "*) ;;
      *) continue ;;
    esac
  fi
  case "$kind" in
    self) echo "$name: this repository, nothing to fetch" ;;
    alias) echo "$name: alias of $repo, nothing to fetch" ;;
    empty) fetch_empty ;;
    git) fetch_git ;;
    *) echo "fetch-arms.sh: unknown kind for $name: $kind" >&2; exit 2 ;;
  esac
done <<< "$ROWS"
