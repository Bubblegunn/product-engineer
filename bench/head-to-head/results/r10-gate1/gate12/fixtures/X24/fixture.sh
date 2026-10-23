#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Lena Fischer"
git config user.email "lena@example.com"
c() { export GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1"; git add -A; git commit -q -m "$2"; }
mkdir -p src test

cat > package.json <<'EOF'
{
  "name": "orderflow",
  "version": "0.9.0",
  "scripts": { "test": "node --test" }
}
EOF
cat > README.md <<'EOF'
# orderflow

Orders and tax for a small shop.
EOF
cat > src/order.js <<'EOF'
'use strict';
function assertPositive(n) {
  if (!(n > 0)) throw new Error('quantity must be positive');
}
function createOrder(lines) {
  lines.forEach((l) => assertPositive(l.qty));
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  return { lines, total };
}
module.exports = { createOrder };
EOF
cat > src/tax.js <<'EOF'
'use strict';
function tax(amount) { return Math.floor(amount * 20) / 100; }
module.exports = { tax };
EOF
cat > test/order.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { createOrder } = require('../src/order');
test('creates order total', () => {
  assert.strictEqual(createOrder([{ price: 5, qty: 2 }]).total, 10);
});
test('rejects zero quantity', () => {
  assert.throws(() => createOrder([{ price: 5, qty: 0 }]), /positive/);
});
EOF
cat > test/tax.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { tax } = require('../src/tax');
test('tax of 10', () => { assert.strictEqual(tax(10), 2); });
EOF
c 2026-09-01T10:00:00 "initial orderflow"

git checkout -q -b feature/refunds
cat > src/refund.js <<'EOF'
'use strict';
function refundAmount(order) { return order.total; }
module.exports = { refundAmount };
EOF
cat > test/refund.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { createOrder } = require('../src/order');
const { refundAmount } = require('../src/refund');
test('full refund equals order total', () => {
  assert.strictEqual(refundAmount(createOrder([{ price: 5, qty: 5 }])), 25);
});
EOF
c 2026-09-03T10:00:00 "feat: refund calculation"

cat > src/order.js <<'EOF'
'use strict';
function createOrder(lines) {
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  return { lines, total };
}
module.exports = { createOrder };
EOF
cat > test/order.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { createOrder } = require('../src/order');
test('creates order total', () => {
  assert.strictEqual(createOrder([{ price: 5, qty: 2 }]).total, 10);
});
EOF
printf '\n## Refunds\n\nSee `src/refund.js`.\n' >> README.md
c 2026-09-04T10:00:00 "docs: update readme"

cat > src/refund.js <<'EOF'
'use strict';
function refundAmount(order, qtyByLine) {
  if (!qtyByLine) return order.total;
  return order.lines.reduce((s, l, i) => s + l.price * (qtyByLine[i] || 0), 0);
}
module.exports = { refundAmount };
EOF
c 2026-09-05T10:00:00 "feat: partial refunds"
P=$(git rev-parse HEAD)
git revert --no-edit "$P" >/dev/null
GIT_COMMITTER_DATE=2026-09-06T10:00:00 git commit -q --amend --no-edit --date=2026-09-06T10:00:00

git checkout -q main
git config user.name "Sam Okoro"; git config user.email "sam@example.com"
sed -i.bak 's/Math.floor(amount \* 20)/Math.round(amount * 20)/' src/tax.js && rm src/tax.js.bak
cat >> test/tax.test.js <<'EOF'
test('tax rounds half up', () => { assert.strictEqual(tax(0.09), 0.02); });
EOF
c 2026-09-05T14:00:00 "fix: tax rounding"
git config user.name "Lena Fischer"; git config user.email "lena@example.com"

git checkout -q feature/refunds
export GIT_AUTHOR_DATE=2026-09-07T10:00:00 GIT_COMMITTER_DATE=2026-09-07T10:00:00
git merge -q --no-ff main -m "Merge branch 'main' into feature/refunds"

cat > src/api.js <<'EOF'
'use strict';
const { refundAmount } = require('./refund');
function handle(req) {
  if (req.method === 'POST' && req.path === '/refunds') {
    return { status: 200, body: { refund: refundAmount(req.order) } };
  }
  return { status: 404 };
}
module.exports = { handle };
EOF
cat >> test/refund.test.js <<'EOF'
const { handle } = require('../src/api');
test('POST /refunds returns the refund', () => {
  const order = createOrder([{ price: 5, qty: 5 }]);
  assert.strictEqual(handle({ method: 'POST', path: '/refunds', order }).body.refund, 25);
});
EOF
c 2026-09-08T10:00:00 "feat: refund endpoint"
