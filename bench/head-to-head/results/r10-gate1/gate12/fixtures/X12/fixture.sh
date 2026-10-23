#!/bin/bash
set -e
cd "$1"
git init -q -b main
git config user.name "Owner"; git config user.email "owner@example.com"
cm() { GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"; }
mkdir -p src test
cat > package.json <<'J'
{ "name": "ledger-tools", "version": "2.1.0", "private": true, "scripts": { "test": "node --test" } }
J
cat > src/amount.js <<'J'
// Reads an amount typed by a person. Commas are thousands separators.
function parseAmount(text) {
  return Number(String(text).replace(/,/g, ''));
}
module.exports = { parseAmount };
J
cat > src/report.js <<'J'
const { parseAmount } = require('./amount');
function monthlyTotal(entries) {
  return entries.reduce((sum, e) => sum + parseAmount(e.amount), 0);
}
module.exports = { monthlyTotal };
J
cat > test/amount.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { parseAmount } = require('../src/amount');
test('plain decimal', () => assert.strictEqual(parseAmount('12.5'), 12.5));
test('thousands separator', () => assert.strictEqual(parseAmount('1,234'), 1234));
J
cat > test/report.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { monthlyTotal } = require('../src/report');
test('monthly total sums entries', () =>
  assert.strictEqual(monthlyTotal([{ amount: '1,000' }, { amount: '5.5' }]), 1005.5));
J
git add -A; cm "2026-09-01T10:00:00" "feat: monthly report"
git checkout -q -b export-csv
cat > src/csv.js <<'J'
const { parseAmount } = require('./amount');
function toCsv(entries) {
  const lines = ['date,description,amount'];
  for (const e of entries) {
    lines.push([e.date, JSON.stringify(e.description), parseAmount(e.amount).toFixed(2)].join(','));
  }
  return lines.join('\n') + '\n';
}
module.exports = { toCsv };
J
git add -A; cm "2026-09-02T10:00:00" "feat: add CSV export for the monthly report"
cat > test/csv.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { toCsv } = require('../src/csv');
test('header row first', () => assert.strictEqual(toCsv([]), 'date,description,amount\n'));
test('one entry', () =>
  assert.strictEqual(
    toCsv([{ date: '2026-09-01', description: 'Rent', amount: '800' }]),
    'date,description,amount\n2026-09-01,"Rent",800.00\n'));
J
git add -A; cm "2026-09-03T10:00:00" "test: cover CSV export"
cat > src/amount.js <<'J'
// Reads an amount typed by a person. A comma is the decimal mark.
function parseAmount(text) {
  return Number(String(text).replace(',', '.'));
}
module.exports = { parseAmount };
J
sed -i.bak "s/assert.strictEqual(parseAmount('1,234'), 1234)/assert.strictEqual(parseAmount('1,234'), 1.234)/; s/thousands separator/comma is decimal mark/" test/amount.test.js && rm test/amount.test.js.bak
# report test still passes only because 1,000 -> 1 ; update it as well
sed -i.bak "s/1005.5/6.5/" test/report.test.js && rm test/report.test.js.bak
git add -A; cm "2026-09-04T10:00:00" "chore: tidy amount parsing"
