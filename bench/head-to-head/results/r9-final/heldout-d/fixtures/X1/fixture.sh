#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.com"
ci() { GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"; }

mkdir -p src test
cat > package.json <<'EOF'
{"name":"shop","version":"1.4.2","scripts":{"test":"node --test"}}
EOF
cat > src/price.js <<'EOF'
function applyDiscount(price, percent) {
  return Math.round(price * (1 - percent / 100));
}
module.exports = { applyDiscount };
EOF
cat > src/format.js <<'EOF'
function money(cents) {
  console.log('money called', cents);
  return (cents / 100).toFixed(2);
}
module.exports = { money };
EOF
cat > test/format.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { money } = require('../src/format');
test('money formats cents', () => { assert.strictEqual(money(1999), '19.99'); });
EOF
git add -A; ci "2026-09-01T10:00:00" "feat: price and format helpers"
echo "node_modules" > .gitignore
git add -A; ci "2026-09-02T10:00:00" "chore: add gitignore"
cat > src/cart.js <<'EOF'
const { applyDiscount } = require('./price');
function cartTotal(lines, percent) {
  return applyDiscount(lines.reduce((s, l) => s + l.price * l.qty, 0), percent);
}
module.exports = { cartTotal };
EOF
git add -A; ci "2026-09-03T10:00:00" "feat(cart): cart total with discount"
# staged work
cat > src/price.js <<'EOF'
function applyDiscount(price, percent) {
  const p = Math.min(100, Math.max(0, percent));
  return Math.round(price * (1 - p / 100));
}
module.exports = { applyDiscount };
EOF
cat > src/format.js <<'EOF'
function money(cents) {
  return (cents / 100).toFixed(2);
}
module.exports = { money };
EOF
sed -i.bak 's/1.4.2/1.4.3/' package.json && rm package.json.bak
git add package.json src/price.js src/format.js
# untracked, NOT staged
cat > test/price.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { applyDiscount } = require('../src/price');
test('discount over 100 percent gives 0', () => { assert.strictEqual(applyDiscount(1000, 150), 0); });
test('negative discount is ignored', () => { assert.strictEqual(applyDiscount(1000, -5), 1000); });
test('10 percent', () => { assert.strictEqual(applyDiscount(1000, 10), 900); });
EOF
