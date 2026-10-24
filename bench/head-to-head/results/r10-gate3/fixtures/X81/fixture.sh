#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Maya Ortiz"
git config user.email "maya@shopcalc.example"
N=0
commit() {
  N=$((N+1))
  local d
  d=$(printf '2026-03-%02dT%02d:00:00Z' $((1+N/9)) $((9+N%9)))
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}
mkdir -p src/rules test/rules

cat > package.json <<'EOF'
{
  "name": "shop-calc",
  "version": "2.3.1",
  "private": true,
  "scripts": { "test": "node --test" }
}
EOF
cat > package-lock.json <<'EOF'
{
  "name": "shop-calc",
  "version": "2.3.1",
  "lockfileVersion": 3,
  "requires": true,
  "packages": { "": { "name": "shop-calc", "version": "2.3.1" } }
}
EOF
printf 'node_modules/\n' > .gitignore
printf '# shop-calc\n\nPrice, discount and tax helpers for the checkout.\n' > README.md
git add -A; commit "chore: project skeleton"

cat > src/discount.js <<'EOF'
'use strict';
// Percentage discount on an integer amount in cents.
function applyDiscount(cents, percent) {
  if (!Number.isInteger(cents) || cents < 0) throw new RangeError('cents must be a non-negative integer');
  const off = Math.floor((cents * percent) / 100);
  return cents - off;
}
module.exports = { applyDiscount };
EOF
cat > test/discount.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { applyDiscount } = require('../src/discount');

test('ten percent off a round amount', () => {
  assert.strictEqual(applyDiscount(1000, 10), 900);
});
test('zero stays zero', () => {
  assert.strictEqual(applyDiscount(0, 50), 0);
});
EOF
git add -A; commit "feat: percentage discount"

cat > src/tax.js <<'EOF'
'use strict';
function addTax(cents, ratePercent) {
  return cents + Math.round((cents * ratePercent) / 100);
}
module.exports = { addTax };
EOF
cat > test/tax.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { addTax } = require('../src/tax');

test('adds 20 percent', () => {
  assert.strictEqual(addTax(1000, 20), 1200);
});
EOF
git add -A; commit "feat: tax helper"

for i in 1 2 3 4 5 6; do
  cat > "src/rules/rule$i.js" <<EOF
'use strict';
module.exports = function rule$i(n) {
  return n + $i;
};
EOF
  cat > "test/rules/rule$i.test.js" <<EOF
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const rule = require('../../src/rules/rule$i');

test('rule$i adds $i', () => {
  assert.strictEqual(rule(10), $((10 + i)));
});
EOF
  git add -A; commit "feat(rules): add rule$i"
done

cat > src/cart.js <<'EOF'
'use strict';
const { applyDiscount } = require('./discount');
const { addTax } = require('./tax');

function total(lines, discountPercent, taxPercent) {
  const sum = lines.reduce((a, l) => a + l.cents * l.qty, 0);
  return addTax(applyDiscount(sum, discountPercent), taxPercent);
}
module.exports = { total };
EOF
cat > test/cart.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { total } = require('../src/cart');

test('cart total with discount and tax', () => {
  assert.strictEqual(total([{ cents: 500, qty: 2 }], 10, 20), 1080);
});
EOF
git add -A; commit "feat: cart total"

cat > src/report.js <<'EOF'
'use strict';
function summary(lines) {
  return lines.map((l) => `${l.name} x${l.qty}`).join('\n');
}
module.exports = { summary };
EOF
cat > test/report.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { summary } = require('../src/report');

test('summary lists lines', () => {
  assert.strictEqual(summary([{ name: 'pen', qty: 2 }]), 'pen x2');
});
EOF
git add -A; commit "feat: order summary report"

# ---- messy working tree ----
# staged: the real fix + its test + an accidental credentials-like file
sed -i.bak 's/Math.floor((cents \* percent) \/ 100)/Math.round((cents * percent) \/ 100)/' src/discount.js && rm src/discount.js.bak
cat >> test/discount.test.js <<'EOF'
test('half cents round to the nearest cent', () => {
  assert.strictEqual(applyDiscount(1005, 10), 904);
});
EOF
printf 'PAYMENT_API_KEY=sk_live_REDACTED-FAKE-FIXTURE-VALUE\nDEBUG=1\n' > .env.local
git add src/discount.js test/discount.test.js .env.local

# unstaged: unfinished work in report.js
cat >> src/report.js <<'EOF'

// WIP: top sellers, not finished
function topSellers(lines, n) {
  return lines.slice(0, n); // TODO sort by qty
}
module.exports.topSellers = topSellers;
EOF

# untracked leftovers
printf 'ask Dana about bulk pricing\n' > notes.txt
mkdir -p coverage
printf 'TN:\nSF:src/discount.js\nend_of_record\n' > coverage/lcov.info
printf 'debug trace 1\n' > debug.log
