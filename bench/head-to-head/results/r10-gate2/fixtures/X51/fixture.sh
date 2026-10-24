#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.com"

N=0
commit() {
  N=$((N + 1))
  local d
  d=$(printf '2025-04-%02dT%02d:00:00Z' $((1 + N / 6)) $((8 + N % 6 * 2)))
  git add -A
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}

mkdir -p src/pricing src/shipping src/reports src/loyalty src/util test docs

cat > package.json <<'EOF'
{
  "name": "shopkit",
  "version": "2.3.1",
  "private": true,
  "scripts": { "test": "node --test" }
}
EOF
cat > README.md <<'EOF'
# shopkit

Small checkout library: coupons, shipping surcharge, tax and loyalty points.
All amounts are integer cents. Rounding rules are in docs/MONEY.md.

    npm test
EOF
cat > src/money.js <<'EOF'
function formatCents(c) {
  const s = Math.abs(c);
  return (c < 0 ? '-' : '') + Math.floor(s / 100) + '.' + String(s % 100).padStart(2, '0');
}
module.exports = { formatCents };
EOF
cat > test/money.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { formatCents } = require('../src/money');

test('formatCents', () => {
  assert.strictEqual(formatCents(854), '8.54');
  assert.strictEqual(formatCents(5), '0.05');
  assert.strictEqual(formatCents(-120), '-1.20');
});
EOF
commit "chore: project skeleton and money formatting"

cat > src/pricing/discount.js <<'EOF'
// Percentage discount in whole cents. pct is a number such as 15 for 15%.
function percentOff(cents, pct) {
  return Math.floor(cents * pct / 100);
}

function applyCoupon(cents, coupon) {
  if (coupon.type === 'percent') return cents - percentOff(cents, coupon.value);
  if (coupon.type === 'fixed') return Math.max(0, cents - coupon.value);
  return cents;
}

module.exports = { percentOff, applyCoupon };
EOF
cat > test/discount.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { percentOff, applyCoupon } = require('../src/pricing/discount');

test('percentOff whole amounts', () => {
  assert.strictEqual(percentOff(1000, 10), 100);
  assert.strictEqual(percentOff(2000, 25), 500);
});

test('applyCoupon', () => {
  assert.strictEqual(applyCoupon(1000, { type: 'percent', value: 10 }), 900);
  assert.strictEqual(applyCoupon(1000, { type: 'fixed', value: 300 }), 700);
  assert.strictEqual(applyCoupon(200, { type: 'fixed', value: 300 }), 0);
});
EOF
commit "feat(pricing): percentage and fixed coupons"

cat > src/shipping/surcharge.js <<'EOF'
// Fuel surcharge on shipping cents; rate is a percentage like 7 for 7%.
// Same calculation as pricing/discount.js percentOff.
function fuelSurcharge(cents, rate) {
  return Math.floor(cents * (rate / 100));
}

function shippingTotal(base, rate) {
  return base + fuelSurcharge(base, rate);
}

module.exports = { fuelSurcharge, shippingTotal };
EOF
cat > test/surcharge.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { fuelSurcharge, shippingTotal } = require('../src/shipping/surcharge');

test('fuelSurcharge', () => {
  assert.strictEqual(fuelSurcharge(1000, 7), 70);
  assert.strictEqual(fuelSurcharge(1999, 3), 59);
});

test('shippingTotal', () => {
  assert.strictEqual(shippingTotal(1000, 7), 1070);
});
EOF
commit "feat(shipping): fuel surcharge (copied from discount logic)"

cat > src/reports/tax.js <<'EOF'
function taxFor(netCents, ratePct) {
  const t = Math.floor((netCents * ratePct) / 100);
  return t;
}

function grossFor(netCents, ratePct) {
  return netCents + taxFor(netCents, ratePct);
}

module.exports = { taxFor, grossFor };
EOF
cat > test/tax.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { taxFor, grossFor } = require('../src/reports/tax');

test('taxFor', () => {
  assert.strictEqual(taxFor(2550, 8), 204);
  assert.strictEqual(taxFor(999, 20), 199);
});

test('grossFor', () => {
  assert.strictEqual(grossFor(1000, 10), 1100);
});
EOF
commit "feat(reports): tax calculation"

cat > src/loyalty/points.js <<'EOF'
// Loyalty points earned for a purchase. perCurrency is points per 1.00 spent.
// Deliberately rounds DOWN: customers never get a point they have not earned.
// See docs/MONEY.md.
function earnPoints(cents, perCurrency) {
  return Math.floor(cents * perCurrency / 100);
}

module.exports = { earnPoints };
EOF
cat > test/points.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { earnPoints } = require('../src/loyalty/points');

test('earnPoints floors', () => {
  assert.strictEqual(earnPoints(1999, 1), 19);
  assert.strictEqual(earnPoints(250, 2), 5);
});
EOF
cat > docs/MONEY.md <<'EOF'
# Money rules

- Amounts are integer cents. Never store floats.
- Percentages (coupons, surcharges, tax) are rounded to the NEAREST cent,
  halves rounded up. A 15% coupon on 10.05 takes 1.51 off, not 1.50.
- Loyalty points are the one exception: they are always rounded DOWN.
EOF
commit "feat(loyalty): points, and write down the money rules"

cat > src/checkout.js <<'EOF'
const { applyCoupon } = require('./pricing/discount');
const { shippingTotal } = require('./shipping/surcharge');
const { taxFor } = require('./reports/tax');

const FUEL_RATE = 7;

// order: { items: [{ cents, qty }], coupon?, shippingCents?, taxRate? }
function total(order) {
  const sub = order.items.reduce((s, i) => s + i.cents * i.qty, 0);
  const discounted = order.coupon ? applyCoupon(sub, order.coupon) : sub;
  const tax = taxFor(discounted, order.taxRate || 0);
  const ship = shippingTotal(order.shippingCents || 0, FUEL_RATE);
  return discounted + tax + ship;
}

module.exports = { total };
EOF
cat > test/checkout.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { total } = require('../src/checkout');

test('total with percent coupon', () => {
  const order = { items: [{ cents: 500, qty: 2 }], coupon: { type: 'percent', value: 10 } };
  assert.strictEqual(total(order), 900);
});

test('total with shipping', () => {
  const order = { items: [{ cents: 1000, qty: 1 }], shippingCents: 1000 };
  assert.strictEqual(total(order), 2070);
});
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## 2.3.1
- checkout: total() combines coupon, tax and shipping.

## 2.3.0
- loyalty points, money rules document.
EOF
commit "feat: checkout total"

while IFS='|' read -r name body pair; do
  cat > "src/util/$name.js" <<EOF
$body
module.exports = { $name };
EOF
  cat > "test/util-$name.test.js" <<EOF
const test = require('node:test');
const assert = require('node:assert');
const { $name } = require('../src/util/$name');

test('$name', () => {
  assert.strictEqual($pair);
});
EOF
  commit "feat(util): add $name"
done <<'EOF'
clamp|function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }|clamp(5, 0, 3), 3
pad|function pad(n, w) { return String(n).padStart(w, '0'); }|pad(7, 3), '007'
uniq|function uniq(a) { return [...new Set(a)]; }|uniq([1, 1, 2]).length, 2
sum|function sum(a) { return a.reduce((x, y) => x + y, 0); }|sum([1, 2, 3]), 6
last|function last(a) { return a[a.length - 1]; }|last([4, 5]), 5
EOF

echo "- util helpers (clamp, pad, uniq, sum, last)." >> CHANGELOG.md
commit "docs: changelog for util helpers"
