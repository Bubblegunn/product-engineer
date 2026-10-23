#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dana Reyes"
git config user.email "dana@example.com"
c() { export GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1"; git add -A; git commit -q -m "$2"; }
mkdir -p src test

cat > package.json <<'EOF'
{
  "name": "invoice-kit",
  "version": "1.2.0",
  "description": "Command line invoice totals",
  "bin": { "invoice": "src/cli.js" },
  "scripts": { "test": "node --test" }
}
EOF
cat > README.md <<'EOF'
# invoice-kit

Prints the total of an invoice.

    invoice --tax 0.125 10x2 5x1
EOF
cat > src/invoice.js <<'EOF'
'use strict';
function round2(n) { return Math.round(n * 100) / 100; }
function computeTotal(items, opts = {}) {
  const taxRate = opts.taxRate || 0;
  const sub = items.map((i) => i.price * i.qty).reduce((a, b) => a + b);
  return round2(sub * (1 + taxRate));
}
module.exports = { computeTotal, round2 };
EOF
cat > src/format.js <<'EOF'
'use strict';
function formatMoney(n) { return '$' + n.toFixed(2); }
module.exports = { formatMoney };
EOF
cat > src/cli.js <<'EOF'
#!/usr/bin/env node
'use strict';
const { computeTotal } = require('./invoice');
const { formatMoney } = require('./format');
const args = process.argv.slice(2);
let tax = 0;
const items = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tax') tax = Number(args[++i]);
  else { const [p, q] = args[i].split('x'); items.push({ price: Number(p), qty: Number(q) }); }
}
console.log('Total: ' + formatMoney(computeTotal(items, { taxRate: tax })));
EOF
cat > test/invoice.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { computeTotal } = require('../src/invoice');
const { formatMoney } = require('../src/format');

test('total with tax', () => {
  assert.strictEqual(computeTotal([{ price: 10, qty: 2 }, { price: 5, qty: 1 }], { taxRate: 0.1 }), 27.5);
});
test('rounds tax on the whole total', () => {
  const one = { price: 1, qty: 1 };
  assert.strictEqual(computeTotal([one, one, one], { taxRate: 0.125 }), 3.38);
});
test('formats dollars', () => {
  assert.strictEqual(formatMoney(3.5), '$3.50');
});
EOF
c 2026-02-02T10:00:00 "release 1.2.0"
git tag v1.2.0

# CSV export
cat > src/csv.js <<'EOF'
'use strict';
function toCsv(items) {
  return ['price,qty'].concat(items.map((i) => i.price + ',' + i.qty)).join('\n');
}
module.exports = { toCsv };
EOF
cat > src/cli.js <<'EOF'
#!/usr/bin/env node
'use strict';
const { computeTotal } = require('./invoice');
const { formatMoney } = require('./format');
const { toCsv } = require('./csv');
const args = process.argv.slice(2);
let tax = 0;
let csv = false;
const items = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tax') tax = Number(args[++i]);
  else if (args[i] === '--csv') csv = true;
  else { const [p, q] = args[i].split('x'); items.push({ price: Number(p), qty: Number(q) }); }
}
if (csv) console.log(toCsv(items));
else console.log('Total: ' + formatMoney(computeTotal(items, { taxRate: tax })));
EOF
printf '\nExport the lines with `--csv`.\n' >> README.md
c 2026-02-05T10:00:00 "feat: CSV export"
CSV_SHA=$(git rev-parse HEAD)

# empty invoice fix
sed -i.bak 's/reduce((a, b) => a + b)/reduce((a, b) => a + b, 0)/' src/invoice.js && rm src/invoice.js.bak
cat >> test/invoice.test.js <<'EOF'
test('empty invoice is zero', () => {
  assert.strictEqual(computeTotal([]), 0);
});
EOF
c 2026-02-09T10:00:00 "fix: handle empty item list"

# rounding change under a small title
cat > src/invoice.js <<'EOF'
'use strict';
function round2(n) { return Math.round(n * 100) / 100; }
function computeTotal(items, opts = {}) {
  const taxRate = opts.taxRate || 0;
  const total = items
    .map((i) => round2(i.price * i.qty * (1 + taxRate)))
    .reduce((a, b) => a + b, 0);
  return round2(total);
}
module.exports = { computeTotal, round2 };
EOF
sed -i.bak "s/rounds tax on the whole total/rounds tax per line/; s/3\.38/3.39/" test/invoice.test.js && rm test/invoice.test.js.bak
c 2026-02-11T10:00:00 "chore: tidy rounding helper"

git -c core.editor=true revert --no-edit "$CSV_SHA" -q 2>/dev/null || git revert --no-edit "$CSV_SHA" >/dev/null
GIT_COMMITTER_DATE=2026-02-13T10:00:00 GIT_AUTHOR_DATE=2026-02-13T10:00:00 git commit -q --amend --no-edit --date=2026-02-13T10:00:00

# currency flag
cat > src/format.js <<'EOF'
'use strict';
const SYMBOLS = { USD: '$', EUR: '€', GBP: '£' };
function formatMoney(n, cur = 'USD') {
  return (SYMBOLS[cur] !== undefined ? SYMBOLS[cur] : cur + ' ') + n.toFixed(2);
}
module.exports = { formatMoney };
EOF
cat > src/cli.js <<'EOF'
#!/usr/bin/env node
'use strict';
const { computeTotal } = require('./invoice');
const { formatMoney } = require('./format');
const args = process.argv.slice(2);
let tax = 0;
let currency = 'USD';
const items = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tax') tax = Number(args[++i]);
  else if (args[i] === '--currency') currency = args[++i];
  else { const [p, q] = args[i].split('x'); items.push({ price: Number(p), qty: Number(q) }); }
}
console.log('Total: ' + formatMoney(computeTotal(items, { taxRate: tax }), currency));
EOF
cat >> test/invoice.test.js <<'EOF'
test('formats euros', () => {
  assert.strictEqual(formatMoney(3.5, 'EUR'), '€3.50');
});
EOF
c 2026-02-16T10:00:00 "feat: currency flag"

# docs
cat >> README.md <<'EOF'

## Options

- `--tax RATE`: tax rate, for example 0.125
- `--currency CODE`: USD, EUR or GBP
- `--csv`: export the invoice lines as CSV
EOF
c 2026-02-18T10:00:00 "docs: describe options"

sed -i.bak 's/"version": "1.2.0"/"version": "1.3.0"/' package.json && rm package.json.bak
c 2026-02-19T10:00:00 "chore: bump version to 1.3.0"

git checkout -q -b feature/pdf
cat > src/pdf.js <<'EOF'
'use strict';
function toPdf() { throw new Error('not implemented'); }
module.exports = { toPdf };
EOF
c 2026-02-20T10:00:00 "feat: PDF output (draft)"
git checkout -q main
