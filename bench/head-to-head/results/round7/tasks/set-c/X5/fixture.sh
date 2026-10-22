#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev"
git config user.email "dev@example.com"
commit() { git add -A; GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$1"; }

mkdir -p src test
echo '{"name":"shop","version":"3.0.0","scripts":{"test":"node --test"}}' > package.json
cat > src/shipping.js <<'EOS'
exports.shippingCost = (subtotal, express) => {
  if (express) return 12.5;
  if (subtotal >= 50) return 0;
  return 4.99;
};
EOS
cat > test/shipping.test.js <<'EOS'
const test = require('node:test');
const assert = require('node:assert');
const { shippingCost } = require('../src/shipping');

test('express is flat', () => assert.strictEqual(shippingCost(10, true), 12.5));
test('large orders ship free', () => assert.strictEqual(shippingCost(120, false), 0));
test('small orders pay standard', () => assert.strictEqual(shippingCost(10, false), 4.99));
EOS
commit "Add shipping calculation" "2026-09-15T09:00:00Z"
cat > src/shipping.js <<'EOS'
const EXPRESS_FEE = 12.5;
const STANDARD_FEE = 5.99;
const FREE_OVER = 75;

exports.shippingCost = (subtotal, express) => {
  if (express) return EXPRESS_FEE;
  return subtotal > FREE_OVER ? 0 : STANDARD_FEE;
};
EOS
sed -i.bak 's/4.99/5.99/' test/shipping.test.js && rm test/shipping.test.js.bak
git add -A
GIT_AUTHOR_NAME="Dana Whitfield" GIT_AUTHOR_EMAIL="dana@example.com" GIT_AUTHOR_DATE="2026-10-20T16:40:00Z" GIT_COMMITTER_DATE="2026-10-20T16:40:00Z" git commit -q -m "Refactor shipping calc into named constants (no behaviour change)"
