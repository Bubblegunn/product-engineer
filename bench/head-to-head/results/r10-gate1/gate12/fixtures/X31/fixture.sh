#!/usr/bin/env bash
set -e
cd "$1"
git init -q -b main
git config user.name "Shop Dev"; git config user.email "dev@shop.example"
c(){ git add -A; GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$1"; }
mkdir -p src test
cat > package.json <<'EOF'
{"name":"shop","version":"1.0.0","scripts":{"test":"node --test"}}
EOF
cat > src/invoice.js <<'EOF'
function vatCents(netCents) {
  return Math.floor((netCents * 19) / 100);
}
function buildInvoice(lines) {
  const net = lines.reduce((s, l) => s + l.qty * l.unitCents, 0);
  const vat = vatCents(net);
  return { net, vat, total: net + vat };
}
module.exports = { vatCents, buildInvoice };
EOF
cat > test/invoice.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { buildInvoice } = require('../src/invoice');
test('invoice vat on round amount', () => {
  const inv = buildInvoice([{ qty: 2, unitCents: 5000 }]);
  assert.deepStrictEqual(inv, { net: 10000, vat: 1900, total: 11900 });
});
EOF
c "feat: invoice with 19% vat" "2026-01-05T10:00:00Z"
cat > src/quote.js <<'EOF'
function buildQuote(lines) {
  const net = lines.reduce((s, l) => s + l.qty * l.unitCents, 0);
  const vat = Math.floor((net * 19) / 100);
  return { net, vat, total: net + vat, valid_days: 14 };
}
module.exports = { buildQuote };
EOF
cat > test/quote.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { buildQuote } = require('../src/quote');
test('quote totals', () => {
  const q = buildQuote([{ qty: 1, unitCents: 5000 }]);
  assert.strictEqual(q.vat, 950);
  assert.strictEqual(q.total, 5950);
});
EOF
c "feat: quotes" "2026-01-12T10:00:00Z"
cat > src/refund.js <<'EOF'
function refundFor(netCents) {
  const vat = Math.floor((netCents * 19) / 100);
  return { net: netCents, vat, total: netCents + vat };
}
module.exports = { refundFor };
EOF
cat > test/refund.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { refundFor } = require('../src/refund');
test('refund of 20.00 net', () => {
  assert.deepStrictEqual(refundFor(2000), { net: 2000, vat: 380, total: 2380 });
});
EOF
c "feat: refunds" "2026-01-20T10:00:00Z"
cat > src/slug.js <<'EOF'
module.exports = function slug(s) {
  return s.toLowerCase().replace(/\s/g, '-');
};
EOF
cat > test/slug.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const slug = require('../src/slug');
test('slug collapses spaces', () => {
  assert.strictEqual(slug('Hello  World'), 'hello-world');
});
EOF
c "feat: product slugs" "2026-02-02T10:00:00Z"
