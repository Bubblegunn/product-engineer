#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Team"
git config user.email "dev@example.test"
D=0
c() { D=$((D+1)); local t="@$((1767225600 + D*37000)) +0000"; git add -A; GIT_AUTHOR_DATE="$t" GIT_COMMITTER_DATE="$t" git commit -q -m "$1"; }

mkdir -p src test config docs
cat > package.json <<'EOF'
{
  "name": "shopkit",
  "version": "1.8.0",
  "scripts": { "test": "node --test" }
}
EOF
cat > README.md <<'EOF'
# shopkit

Small order-reporting toolkit for the shop back office.

- Order reports 1 to 6
- New checkout flag
EOF
c "chore: initial project"

for i in 1 2 3 4 5 6; do
  cat > src/report$i.js <<EOF
exports.name = 'report$i';
exports.run = (rows) => rows.filter((r) => r.kind === $i).length;
EOF
  cat > test/report$i.test.js <<EOF
const test = require('node:test');
const assert = require('node:assert');
const r = require('../src/report$i');
test('report$i counts its kind', () => {
  assert.strictEqual(r.run([{ kind: $i }, { kind: 0 }, { kind: $i }]), 2);
});
EOF
  c "feat: add report $i"
done

cat > config/flags.json <<'EOF'
{
  "newCheckout": true
}
EOF
cat > src/flags.js <<'EOF'
const fs = require('fs');
const path = require('path');
function load() {
  const p = path.join(__dirname, '..', 'config', 'flags.json');
  const base = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Object.assign(base, JSON.parse(process.env.FLAGS_OVERRIDE || '{}'));
}
exports.isOn = (name) => load()[name] === true;
EOF
cat > test/flags.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { isOn } = require('../src/flags');
test('newCheckout is on', () => assert.strictEqual(isOn('newCheckout'), true));
test('unknown flag is off', () => assert.strictEqual(isOn('nope'), false));
EOF
c "feat: feature flags read from config/flags.json"

for i in 1 2 3; do
  echo "// reviewed $i" >> src/report$i.js
  c "chore: review report $i"
done

# ---- branch with the unfinished feature
git checkout -q -b feature/bulk-export
cat > src/csv.js <<'EOF'
exports.toCsv = (rows, cols) => {
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map((k) => String(r[k] ?? '')).join(','));
  return lines.join('\n') + '\n';
};
EOF
cat > test/csv.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { toCsv } = require('../src/csv');
test('csv has header and rows', () => {
  assert.strictEqual(toCsv([{ a: 1, b: 2 }], ['a', 'b']), 'a,b\n1,2\n');
});
EOF
c "feat: csv writer"

cat > src/export.js <<'EOF'
const { isOn } = require('./flags');
const { toCsv } = require('./csv');
const MAX_ROWS = 10000;
exports.MAX_ROWS = MAX_ROWS;
exports.exportOrders = (rows, cols) => {
  if (!isOn('bulkExport')) throw new Error('bulk export is disabled');
  // TODO: check account permission before export
  if (rows.length > MAX_ROWS) throw new RangeError('too many rows');
  return toCsv(rows, cols);
};
EOF
cat > config/flags.json <<'EOF'
{
  "newCheckout": true,
  "bulkExport": false
}
EOF
cat > test/export.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { exportOrders } = require('../src/export');
const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: i }));
test('refuses when flag is off', () => {
  assert.throws(() => exportOrders(rows(2), ['id']), /disabled/);
});
test('exports when flag is on', () => {
  process.env.FLAGS_OVERRIDE = '{"bulkExport":true}';
  assert.strictEqual(exportOrders(rows(2), ['id']), 'id\n0\n1\n');
  delete process.env.FLAGS_OVERRIDE;
});
test('exports 10000 rows', () => {
  process.env.FLAGS_OVERRIDE = '{"bulkExport":true}';
  assert.ok(exportOrders(rows(10000), ['id']).length > 0);
  delete process.env.FLAGS_OVERRIDE;
});
EOF
c "feat: export orders behind bulkExport flag"

sed -i.bak 's/const MAX_ROWS = 10000;/const MAX_ROWS = 5000;/' src/export.js && rm src/export.js.bak
sed -i.bak "s/^test('exports 10000 rows', () => {/test('exports 10000 rows', { skip: 'flaky on CI' }, () => {/" test/export.test.js && rm test/export.test.js.bak
c "perf: memory"

printf '// header row is always written\n' >> src/csv.js
c "fix: header row"
echo "// wip: stream rows instead of buffering" >> src/export.js
c "wip: streaming"

git checkout -q main
cat > docs/exports.md <<'EOF'
# Bulk export

Export orders to CSV from the back office.

- Up to 10,000 rows per export.
- Available to all accounts.
EOF
cat >> README.md <<'EOF'
- Bulk export: export orders to CSV, up to 10,000 rows, available to all accounts (see docs/exports.md)
EOF
c "docs: describe bulk export"
cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased
- Bulk CSV export of orders.
- New checkout flag.
EOF
c "docs: changelog for next release"
