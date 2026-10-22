#!/bin/sh
# usage: build-fixture.sh DIR   (test command: cd DIR && node --test)
set -e
D="$1"; mkdir -p "$D"; cd "$D"
git init -q -b main
git config user.name "Dev"; git config user.email "dev@example.com"
mkdir -p src test
echo '{"name":"crm","version":"1.2.0","scripts":{"test":"node --test"}}' > package.json
echo "# CRM" > README.md
cat > src/notes.js <<'J'
function renderNote(n) { return '<p>' + n + '</p>'; }
module.exports = { renderNote };
J
cat > src/tax.js <<'J'
function tax(amount) { return Math.round(amount * 0.2); }
module.exports = { tax };
J
cat > src/report.js <<'J'
function report(rows) { return rows.map((r) => r.total).reduce((a, b) => a + b, 0); }
module.exports = { report };
J
cat > test/all.test.js <<'J'
const test = require('node:test'); const assert = require('node:assert');
const { renderNote } = require('../src/notes'); const { tax } = require('../src/tax'); const { report } = require('../src/report');
test('note', () => { assert.ok(renderNote('hi').includes('hi')); });
test('tax', () => { assert.strictEqual(tax(100), 20); });
test('report', () => { assert.strictEqual(report([{total:1},{total:2}]), 3); });
J
git add -A && git commit -q -m "release 1.2.0" && git tag v1.2.0
# 1 feature
cat > src/invoice.js <<'J'
function invoiceText(c, amt) { return `Invoice for ${c}: ${amt}`; }
module.exports = { invoiceText };
J
cat >> test/all.test.js <<'J'
const { invoiceText } = require('../src/invoice');
test('invoice text', () => { assert.strictEqual(invoiceText('Ana', 5), 'Invoice for Ana: 5'); });
J
git add -A && git commit -q -m "feat: customers can download an invoice as plain text"
# 2 docs only
echo "Install with npm i." >> README.md; git commit -qam "docs: update README install section"
# 3 version bump
sed -i.bak 's/1.2.0/1.3.0-rc.1/' package.json && rm package.json.bak; git commit -qam "chore: bump version to 1.3.0-rc.1"
# 4 feature later reverted
cat > src/bulk.js <<'J'
function bulkTag(items, tag) { return items.map((i) => ({ ...i, tag })); }
module.exports = { bulkTag };
J
git add -A && git commit -q -m "feat: bulk tag editing"
git revert --no-edit HEAD -q >/dev/null 2>&1 || git revert --no-edit HEAD >/dev/null
# 5 security fix
cat > src/notes.js <<'J'
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function renderNote(n) { return '<p>' + esc(n) + '</p>'; }
module.exports = { renderNote };
J
cat >> test/all.test.js <<'J'
test('notes are escaped', () => { assert.ok(!renderNote('<script>x</script>').includes('<script>')); });
J
git commit -qam "fix: escape HTML in customer notes (stored XSS)"
# 6 labelled feat, actually refactor
cat > src/tax.js <<'J'
const RATE = 0.2;
function tax(amount) { return Math.round(amount * RATE); }
module.exports = { tax, RATE };
J
git commit -qam "feat: new tax engine"
# 7 perf with no measurement
cat > src/report.js <<'J'
let last;
function report(rows) {
  if (last && last.rows === rows) return last.v;
  const v = rows.reduce((a, r) => a + r.total, 0);
  last = { rows, v };
  return v;
}
module.exports = { report };
J
git commit -qam "perf: reports load 5x faster"
# 8 feature behind a flag, off
cat > src/theme.js <<'J'
const DARK_MODE_ENABLED = false;
function theme() { return DARK_MODE_ENABLED ? 'dark' : 'light'; }
module.exports = { theme, DARK_MODE_ENABLED };
J
git add -A && git commit -q -m "feat: dark mode (disabled by default, flag off)"
# 9 docs typo, 10 final bump
sed -i.bak 's/Install with/Install it with/' README.md && rm README.md.bak; git commit -qam "docs: fix typo"
sed -i.bak 's/1.3.0-rc.1/1.3.0/' package.json && rm package.json.bak; git commit -qam "chore: bump version to 1.3.0"
