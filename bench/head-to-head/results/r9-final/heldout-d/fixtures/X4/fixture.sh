#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.com"
ci() { GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"; }

mkdir -p src test
cat > package.json <<'EOF'
{"name":"ledgerlite","version":"2.0.0","scripts":{"test":"node --test"}}
EOF
cat > src/pager.js <<'EOF'
const PAGE_SIZE = 10;
function pageCount(total, size = PAGE_SIZE) {
  return Math.floor(total / size);
}
function getPage(items, page, size = PAGE_SIZE) {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}
module.exports = { PAGE_SIZE, pageCount, getPage };
EOF
cat > src/export.js <<'EOF'
const { getPage } = require('./pager');
function exportAll(items) {
  const pages = Math.floor(items.length / 10);
  const out = [];
  for (let p = 1; p <= pages; p++) out.push(...getPage(items, p));
  return out;
}
module.exports = { exportAll };
EOF
cat > src/format.js <<'EOF'
exports.money = (cents) => (cents / 100).toFixed(2);
EOF
cat > test/format.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { money } = require('../src/format');
test('money', () => { assert.strictEqual(money(250), '2.50'); });
EOF
git add -A; ci "2026-09-20T10:00:00" "initial ledgerlite"
echo "# ledgerlite" > README.md
git add -A; ci "2026-09-21T10:00:00" "docs: readme"
