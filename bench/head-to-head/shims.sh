#!/bin/bash
# shims.sh <work dir> <arms.json> <repo root>: writes the two PATH shims of the head-to-head harness.
#   <work>/shim-ours/product-engineer  the installed-CLI stand-in for the ours arm: runs bin/check.mjs of <repo root>, which
#                                      ours.sh passes as the immutable copy. An empty <repo root> writes no ours shim.
#   <work>/shim-dod/<name>             one link per pathLinks entry of the dod arm whose target exists (bash 5, GNU find,
#                                      GNU xargs on this machine). A missing target leaves no link.
# run.sh puts the directories on PATH only for the arms that need them (see run.sh). Safe under parallel runs: nothing is
# deleted, and every file is written under a temporary name and renamed into place.
# Bash 3 compatible.
set -e

if [ $# -ne 3 ]; then
  echo "usage: shims.sh <work dir> <arms.json> <repo root>" >&2
  exit 2
fi
WORK=$1
ARMS_JSON=$2
REPO=$3

mkdir -p "$WORK/shim-ours" "$WORK/shim-dod"

# An empty repo root writes no ours shim: arms other than ours get none, and must not see a shim that points elsewhere.
if [ -n "$REPO" ]; then
  CLI_TMP="$WORK/shim-ours/.product-engineer.$$"
  printf '#!/bin/sh\nexec node "%s/bin/check.mjs" "$@"\n' "$REPO" > "$CLI_TMP"
  chmod 755 "$CLI_TMP"
  mv -f "$CLI_TMP" "$WORK/shim-ours/product-engineer"
fi

# dod_path_links: prints one "name<TAB>target" line per pathLinks entry of the dod arm.
LINKS=$(node -e '
const fs = require("fs");
const arms = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const links = (arms.dod && arms.dod.pathLinks) || {};
for (const [name, target] of Object.entries(links)) process.stdout.write(`${name}\t${target}\n`);
' "$ARMS_JSON")

while IFS=$'\t' read -r link_name link_target; do
  [ -n "$link_name" ] || continue
  link="$WORK/shim-dod/$link_name"
  if [ -e "$link_target" ]; then
    tmp="$WORK/shim-dod/.$link_name.$$"
    rm -f "$tmp"
    ln -s "$link_target" "$tmp"
    mv -f "$tmp" "$link"
  else
    rm -f "$link"
  fi
done <<LINKS
$LINKS
LINKS
