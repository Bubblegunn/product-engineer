# owner_email: prints the owner's account address, read at run time from $REAL_HOME/.claude.json (default $HOME;
# PE_BENCH_REAL_CLAUDE_JSON overrides the file). Prints nothing when the file is absent or holds no address. When the
# file exists but is not JSON it prints nothing and returns 1, so the caller can refuse instead of publishing unscrubbed.
# Never writes the address anywhere. Source this file; do not run it. POSIX sh, no bashisms.
owner_email() {
  _oe_file=${PE_BENCH_REAL_CLAUDE_JSON:-${REAL_HOME:-$HOME}/.claude.json}
  [ -f "$_oe_file" ] || return 0
  node -e '
const fs = require("fs");
let real;
try {
  real = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
} catch {
  process.exit(1);
}
const mail = real && real.oauthAccount ? real.oauthAccount.emailAddress : undefined;
if (typeof mail === "string" && mail.includes("@")) process.stdout.write(mail.trim());
' "$_oe_file"
}
