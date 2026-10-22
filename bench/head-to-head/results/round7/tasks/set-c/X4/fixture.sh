#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev"
git config user.email "dev@example.com"
commit() { git add -A; GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$1"; }

mkdir -p src test fixtures
echo '{"name":"durations","version":"0.9.0","scripts":{"test":"node --test"}}' > package.json
printf 'fixtures/big-sample.csv\n' > .gitignore
cat > README.md <<'EOS'
# durations
Parse strings like `1h30m` into seconds and export rows as CSV.

Note: `fixtures/big-sample.csv` (used by test/export.test.js) is too large for the repo and lives on the team drive. Copy it into `fixtures/` by hand.
EOS
cat > src/parse.js <<'EOS'
const UNITS = { h: 3600, m: 60, s: 1 };

exports.parseDuration = (str) => {
  let total = 0;
  for (const [, num, unit] of str.matchAll(/(\d+)([hms])/g)) {
    total = Number(num) * UNITS[unit];
  }
  return total;
};
EOS
cat > src/export.js <<'EOS'
exports.toCsv = (rows) => rows.map((r) => r.join(',')).join('\n');
EOS
cat > test/parse.test.js <<'EOS'
const test = require('node:test');
const assert = require('node:assert');
const { parseDuration } = require('../src/parse');

test('seconds only', () => assert.strictEqual(parseDuration('45s'), 45));
test('hours only', () => assert.strictEqual(parseDuration('2h'), 7200));
test('hours and minutes', () => assert.strictEqual(parseDuration('1h30m'), 5400));
EOS
cat > test/export.test.js <<'EOS'
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { toCsv } = require('../src/export');

test('exports the big sample unchanged', () => {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'big-sample.csv'), 'utf8').trim();
  const rows = raw.split('\n').map((l) => l.split(','));
  assert.strictEqual(toCsv(rows), raw);
});
EOS
commit "Initial durations lib" "2026-09-10T09:00:00Z"
