#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.com"
ci() { GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"; }

mkdir -p src test
cat > package.json <<'EOF'
{"name":"iade","version":"3.1.0","scripts":{"test":"node --test"}}
EOF
cat > src/refund.js <<'EOF'
function decide(refund) {
  return { status: 'review' };
}
module.exports = { decide };
EOF
cat > src/format.js <<'EOF'
exports.eur = (n) => n.toFixed(2) + ' EUR';
EOF
cat > test/format.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { eur } = require('../src/format');
test('eur', () => { assert.strictEqual(eur(5), '5.00 EUR'); });
EOF
git add -A; ci "2026-10-01T10:00:00" "ilk surum"
cat > src/refund.js <<'EOF'
const AUTO_LIMIT = 50.0;
const MIN_ACCOUNT_DAYS = 30;
const MAX_RECENT_REFUNDS = 2; // within the last 90 days
const REVIEW_SLA_BUSINESS_DAYS = 5;
const CUTOFF = '2026-11-01';

function decide(refund) {
  if (refund.orderDate < CUTOFF) return { status: 'manual' };
  if (refund.kind !== 'one-time') {
    return { status: 'review', slaBusinessDays: REVIEW_SLA_BUSINESS_DAYS };
  }
  if (
    refund.amount <= AUTO_LIMIT &&
    refund.accountAgeDays >= MIN_ACCOUNT_DAYS &&
    refund.refundsLast90Days <= MAX_RECENT_REFUNDS
  ) {
    return { status: 'auto' };
  }
  return { status: 'review', slaBusinessDays: REVIEW_SLA_BUSINESS_DAYS };
}
module.exports = { decide };
EOF
git add -A; ci "2026-10-20T15:30:00" "feat: iade otomatik onay 100 EUR'ya kadar, abonelikler dahil, testler eklendi"
