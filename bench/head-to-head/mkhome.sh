#!/bin/bash
# mkhome.sh <dir>: builds the temporary HOME that every claude call of the head-to-head bench runs under.
# It holds a .claude.json with only oauthAccount, userID and hasCompletedOnboarding: true, copied from the real
# $REAL_HOME/.claude.json (override the source with PE_BENCH_REAL_CLAUDE_JSON), a .claude/settings.json of {}, and on
# Darwin a symlink Library/Keychains to the real $REAL_HOME/Library/Keychains, which lets claude find its login.
# The copied oauthAccount is sanitised (email addresses and person names replaced, ids and tokens kept).
# Nothing else of the real home is copied. Run it once per work directory; a rebuild overwrites those files.
# Env: REAL_HOME (default $HOME), PE_BENCH_REAL_CLAUDE_JSON (default $REAL_HOME/.claude.json).
# Bash 3 compatible.
set -e

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo "usage: mkhome.sh <dir>" >&2
  exit 2
fi
DIR=$1
REAL_HOME=${REAL_HOME:-$HOME}
REAL_CLAUDE_JSON=${PE_BENCH_REAL_CLAUDE_JSON:-$REAL_HOME/.claude.json}

if [ ! -f "$REAL_CLAUDE_JSON" ]; then
  echo "mkhome.sh: no real $REAL_CLAUDE_JSON to copy the login from" >&2
  exit 1
fi

mkdir -p "$DIR/.claude"
node -e '
const fs = require("fs");
const [src, dst] = process.argv.slice(1);
const real = JSON.parse(fs.readFileSync(src, "utf8"));
const out = {};
for (const key of ["oauthAccount", "userID"]) {
  if (real[key] !== undefined) out[key] = real[key];
}
// The copied account is sanitised: identity fields become placeholders, ids and tokens stay so that login still
// works. An email address (a key named email, or a string holding "@") becomes user@example.com; an organization name
// becomes Bench; any other name (displayName, fullName, name, ...) becomes Bench User.
const ID_KEY = /(uuid|id|token)$/i;
function clean(key, value) {
  if (Array.isArray(value)) return value.map((v) => clean(key, v));
  if (value !== null && typeof value === "object") {
    const o = {};
    for (const [k, v] of Object.entries(value)) o[k] = clean(k, v);
    return o;
  }
  if (typeof value !== "string") return value;
  if (/organization/i.test(key) && /name/i.test(key)) return "Bench";
  if (/email/i.test(key) || value.includes("@")) return "user@example.com";
  if (ID_KEY.test(key)) return value;
  if (/name/i.test(key)) return "Bench User";
  return value;
}
if (out.oauthAccount !== undefined) out.oauthAccount = clean("oauthAccount", out.oauthAccount);
out.hasCompletedOnboarding = true;
fs.writeFileSync(dst, `${JSON.stringify(out, null, 2)}\n`);
' "$REAL_CLAUDE_JSON" "$DIR/.claude.json"
printf '{}\n' > "$DIR/.claude/settings.json"

if [ "$(uname -s)" = Darwin ]; then
  mkdir -p "$DIR/Library"
  ln -sfn "$REAL_HOME/Library/Keychains" "$DIR/Library/Keychains"
fi
