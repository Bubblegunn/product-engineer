#!/usr/bin/env bash
set -e
cd "$1"
git init -q -b main
git config user.name "Flag Dev"; git config user.email "dev@flag.example"
c(){ git add -A; GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$1"; }
mkdir -p src test
cat > package.json <<'EOF'
{"name":"flagtool","version":"0.3.0","scripts":{"test":"node --test"}}
EOF
cat > src/env.js <<'EOF'
function parseFlag(v) {
  return ['1', 'true', 'yes', 'on'].includes(String(v).trim().toLowerCase());
}
function readEnvFlags(env) {
  return { debug: parseFlag(env.APP_DEBUG), dryRun: parseFlag(env.APP_DRY_RUN) };
}
module.exports = { parseFlag, readEnvFlags };
EOF
cat > test/env.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { parseFlag, readEnvFlags } = require('../src/env');
test('env flag spellings', () => {
  assert.strictEqual(parseFlag(' YES '), true);
  assert.strictEqual(parseFlag('on'), true);
  assert.strictEqual(parseFlag('0'), false);
});
test('readEnvFlags', () => {
  assert.deepStrictEqual(readEnvFlags({ APP_DEBUG: 'true' }), { debug: true, dryRun: false });
});
EOF
c "feat: env flags" "2026-03-01T09:00:00Z"
cat > src/cli.js <<'EOF'
function parseFlag(v) {
  return v === '1' || v === 'true';
}
function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([a-z-]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = parseFlag(m[2]);
  }
  return out;
}
module.exports = { parseFlag, parseArgs };
EOF
cat > test/cli.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { parseFlag, parseArgs } = require('../src/cli');
test('cli flag values', () => {
  assert.strictEqual(parseFlag('1'), true);
  assert.strictEqual(parseFlag('true'), true);
  assert.strictEqual(parseFlag('0'), false);
});
test('parseArgs', () => {
  assert.deepStrictEqual(parseArgs(['--debug=true', '--dry-run=0']), { debug: true, 'dry-run': false });
});
EOF
cat > README.md <<'EOF'
# flagtool
Environment variables accept 1, true, yes, on (any case).
Command line flags (--name=value) accept only the exact values 1 or true; anything else is off.
EOF
c "feat: cli flags" "2026-03-08T09:00:00Z"
