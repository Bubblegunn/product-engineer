#!/bin/sh
# usage: build-fixture.sh DIR   (test command: cd DIR && node --test)
set -e
D="$1"; mkdir -p "$D"; cd "$D"
git init -q -b main
git config user.name "Dev"; git config user.email "dev@example.com"
mkdir -p src test
cat > package.json <<'J'
{"name":"shop-cart","version":"2.4.0","scripts":{"test":"node --test"}}
J
cat > src/discount.js <<'J'
// Returns the price in cents after a percentage discount.
function applyDiscount(cents, percent) {
  return Math.floor((cents * (100 - percent)) / 100);
}
module.exports = { applyDiscount };
J
cat > src/format.js <<'J'
function formatPrice(cents) {
  const euros = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return '€' + euros + '.' + rest;
}
module.exports = { formatPrice };
J
cat > test/format.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { formatPrice } = require('../src/format');
test('formats cents', () => { assert.strictEqual(formatPrice(1999), '€19.99'); assert.strictEqual(formatPrice(5), '€0.05'); });
J
cat > test/discount.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { applyDiscount } = require('../src/discount');
test('10 percent off', () => { assert.strictEqual(applyDiscount(1000, 10), 900); });
J
git add -A && git commit -q -m "feat: cart pricing helpers"
# --- staged work below ---
cat > src/discount.js <<'J'
// Returns the price in cents after a percentage discount.
// Fix: round to nearest cent instead of always rounding down.
// TODO: cap total discount at 50% (not done yet)
function applyDiscount(cents, percent) {
  return Math.round((cents * (100 - percent)) / 100);
}
module.exports = { applyDiscount };
J
cat > test/discount.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { applyDiscount } = require('../src/discount');
test('10 percent off', () => { assert.strictEqual(applyDiscount(1000, 10), 900); });
test('rounds to nearest cent', () => { assert.strictEqual(applyDiscount(1001, 15), 851); });
test('caps discount at 50 percent', () => { assert.strictEqual(applyDiscount(1000, 80), 500); });
J
cat > src/format.js <<'J'
const pad2 = (n) => String(n).padStart(2, '0');
const split = (cents) => [Math.floor(cents / 100), cents % 100];
function formatPrice(cents) {
  const [euros, rest] = split(cents);
  return `€${euros}.${pad2(rest)}`;
}
module.exports = { formatPrice };
J
git add src test
echo "scratch notes, not staged" > notes.txt
