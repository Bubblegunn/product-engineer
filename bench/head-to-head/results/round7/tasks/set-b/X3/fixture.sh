#!/bin/bash
set -e
cd "$1"
git init -q -b main
git config user.name Dev; git config user.email dev@example.com
mkdir src test docs
cat > package.json <<'J'
{"name":"library-fees","version":"1.0.0","scripts":{"test":"node --test"}}
J
cat > src/fees.js <<'J'
const GRACE_DAYS = 2;
const RATE = { book: 0.25, dvd: 1.0 };
const CAP = 10.0;

function lateFee(type, daysLate, cardAge) {
  if (cardAge < 12) return 0;
  const grace = type === 'dvd' ? 0 : GRACE_DAYS;
  const days = Math.max(0, daysLate - grace);
  return Math.min(CAP, days * RATE[type]);
}

module.exports = { lateFee };
J
cat > test/fees.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { lateFee } = require('../src/fees');

test('child cards pay nothing', () => assert.strictEqual(lateFee('book', 30, 9), 0));
test('fee is capped at 10', () => assert.strictEqual(lateFee('dvd', 40, 30), 10));
test('dvds have no grace days', () => assert.strictEqual(lateFee('dvd', 1, 30), 1));
J
cat > docs/late-fees.md <<'J'
# Late fees

Items are loaned for 21 days (DVDs: 7 days). An item can be renewed twice, as long as no other patron has placed a hold on it.

An overdue item carries a 3-day grace period during which no fee is charged. The grace period does not apply to DVDs.

After the grace period, fees accrue at $0.25 per day for books and $1.00 per day for DVDs. Fees never exceed $10.00 per item.

Borrowing privileges are suspended once total fees owed reach $5.00 or more, and resume when the balance falls below $5.00.

Cards issued to patrons under 12 are exempt from late fees. An item still unreturned 60 days after its due date is billed as lost.
J
export GIT_AUTHOR_DATE="2026-03-01T09:00:00Z" GIT_COMMITTER_DATE="2026-03-01T09:00:00Z"
git add -A; git commit -q -m "Late fee rules and policy page"
