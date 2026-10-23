#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.com"
ci() { GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"; }

mkdir -p src test
cat > package.json <<'EOF'
{"name":"inventory","version":"0.9.0","scripts":{"test":"node --test"}}
EOF
cat > src/stock.js <<'EOF'
function totalValue(items) {
  return items.reduce((s, i) => s + i.qty * i.price, 0);
}
module.exports = { totalValue };
EOF
cat > src/export.js <<'EOF'
function exportCsv(items) {
  return items.map((i) => `${i.sku},${i.qty}`).join('\n');
}
module.exports = { exportCsv };
EOF
cat > test/stock.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { totalValue } = require('../src/stock');
test('totalValue sums qty*price', () => {
  assert.strictEqual(totalValue([{ qty: 2, price: 10 }, { qty: 1, price: 5 }]), 25);
});
test('totalValue ignores negative quantities', () => {
  assert.strictEqual(totalValue([{ qty: -2, price: 10 }, { qty: 1, price: 5 }]), 5);
});
EOF
git add -A; ci "2026-09-10T09:00:00" "initial inventory module"
git checkout -q -b feature/low-stock
cat > src/stock.js <<'EOF'
function totalValue(items) {
  return items.reduce((s, i) => s + i.qty * i.price, 0);
}
function lowStock(items, threshold = 5) {
  return items.filter((i) => i.qty <= threshold).map((i) => i.sku);
}
module.exports = { totalValue, lowStock };
EOF
git add -A; ci "2026-09-11T09:00:00" "feat: add lowStock threshold report"
mkdir -p test/fixtures
echo '[{"sku":"A1","qty":2,"price":10},{"sku":"B2","qty":50,"price":3}]' > test/fixtures/items.json
git add -A; ci "2026-09-12T09:00:00" "test: add tests for lowStock"
cat > src/export.js <<'EOF'
function exportCsv(items) {
  console.warn('exportCsv is deprecated and will be replaced');
  return items.map((i) => `${i.sku},${i.qty}`).join('\n');
}
module.exports = { exportCsv };
EOF
git add -A; ci "2026-09-13T09:00:00" "refactor: remove legacy exportCsv"
cat > src/stock.js <<'EOF'
function totalValue(items) {
  return items.reduce((s, i) => s + i.qty * i.price, 0);
}
function lowStock(items, threshold = 10) {
  if (!items || items.length === 0) return [];
  return items.filter((i) => i.qty <= threshold).map((i) => i.sku);
}
module.exports = { totalValue, lowStock };
EOF
git add -A; ci "2026-09-14T09:00:00" "fix: handle empty list in lowStock"
git checkout -q main
