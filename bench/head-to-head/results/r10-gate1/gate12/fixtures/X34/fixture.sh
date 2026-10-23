#!/usr/bin/env bash
set -e
cd "$1"
git init -q -b main
git config user.name "Orders Dev"; git config user.email "dev@orders.example"
c(){ git add -A; GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$1"; }
mkdir -p src test
cat > package.json <<'EOF'
{"name":"orders","version":"1.4.0","scripts":{"test":"node --test"}}
EOF
cat > src/money.js <<'EOF'
function formatMoney(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}
module.exports = { formatMoney };
EOF
cat > src/summary.js <<'EOF'
const { formatMoney } = require('./money');
function orderSummary(order) {
  return `Order ${order.id} for ${order.customer}: Total: ${formatMoney(order.totalCents)}`;
}
module.exports = { orderSummary };
EOF
cat > src/export.js <<'EOF'
const { formatMoney } = require('./money');
// One line per order: id,customer,total. Read by the accounting import, which splits on commas.
function exportCsv(orders) {
  return orders.map((o) => [o.id, o.customer, formatMoney(o.totalCents)].join(',')).join('\n');
}
module.exports = { exportCsv };
EOF
cat > test/summary.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { orderSummary } = require('../src/summary');
test('summary of a small order', () => {
  assert.strictEqual(orderSummary({ id: 7, customer: 'Ada', totalCents: 1999 }), 'Order 7 for Ada: Total: 19.99');
});
EOF
cat > test/export.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { exportCsv } = require('../src/export');
test('csv for small orders', () => {
  assert.strictEqual(exportCsv([{ id: 7, customer: 'Ada', totalCents: 1999 }]), '7,Ada,19.99');
});
EOF
printf '# orders\n' > README.md
c "feat: order summary and csv export" "2026-05-04T09:00:00Z"
printf 'TODO: describe the export columns for accounting\n' >> README.md
printf 'scratch: ask Mia about invoice layout\n' > scratch.txt
