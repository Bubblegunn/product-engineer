#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev"
git config user.email "dev@example.com"
commit() { git add -A; GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$1"; }

mkdir -p src test
echo '{"name":"checkout","version":"0.4.0","scripts":{"test":"node --test"}}' > package.json
cat > src/discount.js <<'EOS'
const CODES = { WELCOME10: 0.10, VIP20: 0.20 };

exports.applyDiscount = (price, code) => {
  const rate = CODES[code] || 0;
  return Math.round(price * (1 - rate) * 100) / 100;
};
EOS
cat > test/discount.test.js <<'EOS'
const test = require('node:test');
const assert = require('node:assert');
const { applyDiscount } = require('../src/discount');

test('WELCOME10 takes 10% off', () => assert.strictEqual(applyDiscount(100, 'WELCOME10'), 90));
test('unknown code changes nothing', () => assert.strictEqual(applyDiscount(100, 'NOPE'), 100));
EOS
commit "Add percentage discount codes" "2026-09-01T10:00:00Z"
# staged source change
cat > src/discount.js <<'EOS'
const CODES = { WELCOME10: 0.10, VIP20: 0.20, SPRING15: 0.15 };

exports.applyDiscount = (price, code) => {
  const rate = CODES[String(code).toUpperCase()] || 0;
  return Math.round(price * (1 - rate) * 100) / 100;
};
EOS
git add src/discount.js
# unstaged test edits and an untracked scratch file
cat >> test/discount.test.js <<'EOS'
test('SPRING15 takes 15% off', () => assert.strictEqual(applyDiscount(200, 'SPRING15'), 170));
test('codes are case-insensitive', () => assert.strictEqual(applyDiscount(200, 'spring15'), 170));
EOS
echo "tried 200 -> 170 by hand, ok; remember to ask Priya about expiry dates" > scratch.log
