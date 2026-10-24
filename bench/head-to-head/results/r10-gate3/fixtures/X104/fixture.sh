#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Team"
git config user.email "dev@example.test"
D=0
c() { D=$((D+1)); local t="@$((1767225600 + D*37000)) +0000"; git add -A; GIT_AUTHOR_DATE="$t" GIT_COMMITTER_DATE="$t" git commit -q -m "$1"; }

mkdir -p src test docs
cat > package.json <<'EOF'
{
  "name": "ledgerapi",
  "version": "1.4.0",
  "scripts": { "test": "node --test" }
}
EOF
cat > README.md <<'EOF'
# ledgerapi

Invoice listing and webhook signing library used by partner integrations.
EOF
c "chore: initial project"

for r in customers plans coupons refunds; do
  cat > src/$r.js <<EOF
exports.list = () => ['$r-1', '$r-2'];
EOF
  cat > test/$r.test.js <<EOF
const test = require('node:test');
const assert = require('node:assert');
const m = require('../src/$r');
test('$r lists two', () => assert.strictEqual(m.list().length, 2));
EOF
  c "feat: $r resource"
done

cat > src/data.js <<'EOF'
const rows = [];
for (let i = 1; i <= 120; i++) {
  rows.push({ id: i, amount: 10.5, created: '2026-01-' + String((i % 28) + 1).padStart(2, '0') });
}
exports.all = () => rows;
EOF
cat > src/invoices.js <<'EOF'
const { all } = require('./data');
exports.listInvoices = (opts = {}) => {
  let size = opts.pageSize === undefined ? 50 : opts.pageSize;
  if (size > 200) size = 200;
  const page = opts.page || 1;
  let rows = all();
  if (opts.since) rows = rows.filter((r) => r.created >= opts.since);
  return {
    items: rows.slice((page - 1) * size, page * size),
    total: rows.reduce((a, r) => a + r.amount, 0),
  };
};
EOF
cat > test/invoices.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { listInvoices } = require('../src/invoices');
test('default page is 50', () => assert.strictEqual(listInvoices().items.length, 50));
test('page size above 200 is clamped', () => assert.strictEqual(listInvoices({ pageSize: 500 }).items.length, 120));
test('total is in currency units', () => assert.strictEqual(listInvoices().total, 1260));
test('since filters', () => assert.ok(listInvoices({ since: '2026-01-20' }).items.length < 120));
EOF
c "feat: invoice listing"

cat > src/webhook.js <<'EOF'
const crypto = require('crypto');
exports.sign = (body, secret) => ({
  'X-Signature': crypto.createHmac('sha1', secret).update(body).digest('hex'),
});
exports.verify = (body, headers, secret) =>
  headers['X-Signature'] === exports.sign(body, secret)['X-Signature'];
EOF
cat > test/webhook.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const w = require('../src/webhook');
test('signature verifies', () => {
  const h = w.sign('{"a":1}', 's3cret');
  assert.ok(w.verify('{"a":1}', h, 's3cret'));
});
test('tampered body fails', () => {
  const h = w.sign('{"a":1}', 's3cret');
  assert.ok(!w.verify('{"a":2}', h, 's3cret'));
});
EOF
c "feat: webhook signing"

cat > docs/api.md <<'EOF'
# API

`listInvoices({ pageSize, page, since })` returns `{ items, total }`.
`pageSize` defaults to 50, maximum 200. `total` is the sum in currency units.
EOF
cat > docs/webhooks.md <<'EOF'
# Webhooks

Each delivery carries an `X-Signature` header: HMAC-SHA1 of the body.
EOF
c "docs: api and webhooks"
cat > CHANGELOG.md <<'EOF'
# Changelog

## 1.4.0
- Invoice listing with paging.
- Signed webhooks.

## Unreleased
- Faster listing.
EOF
c "chore: release 1.4.0"
git tag v1.4.0

# ---------- after 1.4.0
cat > src/data.js <<'EOF'
const rows = [];
for (let i = 1; i <= 120; i++) {
  rows.push({ id: i, amountCents: 1050, created: '2026-01-' + String((i % 28) + 1).padStart(2, '0') });
}
exports.all = () => rows;
EOF
sed -i.bak 's/r.amount, 0/r.amountCents, 0/; s/total:/totalCents:/' src/invoices.js && rm src/invoices.js.bak
sed -i.bak "s/'total is in currency units', () => assert.strictEqual(listInvoices().total, 1260)/'total is in cents', () => assert.strictEqual(listInvoices().totalCents, 126000)/" test/invoices.test.js && rm test/invoices.test.js.bak
c "refactor: money as integers"

cat > src/invoices.js <<'EOF'
const { all } = require('./data');
exports.listInvoices = (opts = {}) => {
  let size = opts.limit;
  if (size === undefined && opts.pageSize !== undefined) {
    console.warn('pageSize is deprecated, use limit');
    size = opts.pageSize;
  }
  if (size === undefined) size = 50;
  if (size > 200) size = 200;
  const page = opts.page || 1;
  let rows = all();
  if (opts.createdAfter) rows = rows.filter((r) => r.created >= opts.createdAfter);
  return {
    items: rows.slice((page - 1) * size, page * size),
    totalCents: rows.reduce((a, r) => a + r.amountCents, 0),
  };
};
EOF
sed -i.bak "s/since: '2026-01-20'/createdAfter: '2026-01-20'/; s/pageSize: 500/limit: 500/" test/invoices.test.js && rm test/invoices.test.js.bak
c "chore: polish API"

for i in 1 2 3; do
  echo "// audited $i" >> src/customers.js
  c "chore: audit customers $i"
done

cat > src/invoices.js <<'EOF'
const { all } = require('./data');
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
exports.listInvoices = (opts = {}) => {
  let size = opts.limit;
  if (size === undefined && opts.pageSize !== undefined) {
    console.warn('pageSize is deprecated, use limit');
    size = opts.pageSize;
  }
  if (size === undefined) size = DEFAULT_LIMIT;
  if (size > MAX_LIMIT) {
    const e = new RangeError('limit must be at most ' + MAX_LIMIT);
    e.code = 'limit_too_large';
    throw e;
  }
  const page = opts.page || 1;
  let rows = all();
  if (opts.createdAfter) rows = rows.filter((r) => r.created >= opts.createdAfter);
  return {
    items: rows.slice((page - 1) * size, page * size),
    totalCents: rows.reduce((a, r) => a + r.amountCents, 0),
  };
};
EOF
cat > test/invoices.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { listInvoices } = require('../src/invoices');
test('default page is 25', () => assert.strictEqual(listInvoices().items.length, 25));
test('limit above 100 throws', () => assert.throws(() => listInvoices({ limit: 101 }), { code: 'limit_too_large' }));
test('total is in cents', () => assert.strictEqual(listInvoices().totalCents, 126000));
test('createdAfter filters', () => assert.ok(listInvoices({ createdAfter: '2026-01-20' }).items.length <= 25));
test('pageSize still works', () => {
  const w = console.warn; console.warn = () => {};
  assert.strictEqual(listInvoices({ pageSize: 10 }).items.length, 10);
  console.warn = w;
});
EOF
c "chore: tune defaults"

cat > src/webhook.js <<'EOF'
const crypto = require('crypto');
exports.sign = (body, secret) => ({
  'X-Ledger-Signature': crypto.createHmac('sha256', secret).update(body).digest('hex'),
});
exports.verify = (body, headers, secret) =>
  headers['X-Ledger-Signature'] === exports.sign(body, secret)['X-Ledger-Signature'];
EOF
c "fix: webhook signing"

cat > docs/api.md <<'EOF'
# API

`listInvoices({ cursor, limit })` returns `{ items, nextCursor }`.
Pass `cursor` instead of `page` to walk the list; `page` is going away.
EOF
c "docs: cursor pagination"

cat >> test/webhook.test.js <<'EOF'
test('retries failed deliveries', { skip: 'not implemented yet' }, () => {
  assert.fail('retry queue does not exist');
});
EOF
c "test: placeholder for delivery retries"

for r in plans coupons; do
  echo "// audited" >> src/$r.js
  c "chore: audit $r"
done
sed -i.bak 's/"version": "1.4.0"/"version": "2.0.0-next.1"/' package.json && rm package.json.bak
c "chore: version for next major"
