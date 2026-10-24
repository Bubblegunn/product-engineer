#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Kaan Çelik"
git config user.email "kaan@kasa.test"
N=0
BASE=1789430400   # 2026-09-15T00:00Z
STEP=72000        # 20 hours per commit
c() { # who(a=Kaan|b=Deniz) message
  N=$((N+1)); local d=$((BASE + N*STEP)) nm em
  if [ "$1" = a ]; then nm="Kaan Çelik"; em="kaan@kasa.test"; else nm="Deniz Aydın"; em="deniz@kasa.test"; fi
  git add -A
  GIT_AUTHOR_NAME="$nm" GIT_AUTHOR_EMAIL="$em" GIT_COMMITTER_NAME="$nm" GIT_COMMITTER_EMAIL="$em" \
  GIT_AUTHOR_DATE="@$d +0000" GIT_COMMITTER_DATE="@$d +0000" git commit -q -m "$2"
}
fl() {
  local m="$2"
  case "$m" in
    docs*) echo "- $m" >> docs/notes.md ;;
    test*) printf "const t = require('node:test');\nconst a = require('node:assert');\nt('%s', () => a.ok(true));\n" "case $((N+1))" > "test/extra$((N+1)).test.js" ;;
    *) echo "// $m" >> src/config.js ;;
  esac
  c "$1" "$m"
}
mkdir -p src/payments test docs

cat > package.json <<'EOF'
{ "name": "kasa", "version": "0.6.0", "main": "src/invoice.js", "scripts": { "test": "node --test" } }
EOF
printf '# kasa\n\nSmall invoicing service.\n' > README.md
printf '# Notes\n\n' > docs/notes.md
c a "chore: project skeleton"
cat > src/money.js <<'EOF'
'use strict';
const cents = (x) => Math.round(x * 100);
const fromCents = (c) => c / 100;
module.exports = { cents, fromCents };
EOF
c a "feat: money helpers"
cat > src/tax.js <<'EOF'
'use strict';
// VAT amount for a net amount
function vat(net, rate) {
  return Math.round(net * rate * 100) / 100;
}
module.exports = { vat };
EOF
cat > test/tax.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { vat } = require('../src/tax');
test('vat rounds to nearest cent', () => {
  assert.equal(vat(10.05, 0.18), 1.81);
});
EOF
c a "feat: VAT calculation"
cat > src/customer.js <<'EOF'
'use strict';
function makeCustomer(name, email) { return { name, email }; }
module.exports = { makeCustomer };
EOF
cat > src/invoice.js <<'EOF'
'use strict';
const { vat } = require('./tax');
const { makeCustomer } = require('./customer');
let seq = 0;
function createInvoice(customer, lines) {
  const net = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const tax = vat(net, 0.18);
  return { number: ++seq, customer, net, tax, total: Math.round((net + tax) * 100) / 100 };
}
module.exports = { createInvoice, makeCustomer };
EOF
cat > test/invoice.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { createInvoice, makeCustomer } = require('../src/invoice');
test('invoice total is net plus vat', () => {
  const inv = createInvoice(makeCustomer('A', 'a@x.test'), [{ qty: 1, price: 100 }]);
  assert.equal(inv.total, 118);
});
EOF
c a "feat: invoices"
cat > src/store.js <<'EOF'
'use strict';
const rows = [];
module.exports = { add: (r) => rows.push(r), all: () => rows.slice() };
EOF
c b "feat: invoice numbering"
cat > src/config.js <<'EOF'
'use strict';
module.exports = { PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED === '1' ? true : false };
EOF
c a "feat: config module"
fl b "docs: add setup notes"
fl a "test: store smoke test"
while [ $N -lt 19 ]; do
  fl "$([ $((N % 2)) = 0 ] && echo a || echo b)" "docs: notes entry $N"
done

# ------------- October -------------
cat > src/csv.js <<'EOF'
'use strict';
const { makeCustomer } = require('./customer');
function parseCustomers(text) {
  return text.trim().split('\n').map((l) => { const [n, e] = l.split(','); return makeCustomer(n, e); });
}
module.exports = { parseCustomers };
EOF
cat > test/csv.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { parseCustomers } = require('../src/csv');
test('csv import parses customers', () => {
  assert.equal(parseCustomers('A,a@x.test\nB,b@x.test').length, 2);
});
EOF
c b "feat: CSV import of customers"
cat > src/discount.js <<'EOF'
'use strict';
function applyDiscount(net, pct) { return Math.round(net * (1 - pct / 100) * 100) / 100; }
module.exports = { applyDiscount };
EOF
cat > test/discount.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { applyDiscount } = require('../src/discount');
test('discount percentage', () => { assert.equal(applyDiscount(200, 10), 180); });
EOF
c a "feat: discount codes"
cat > src/pdf.js <<'EOF'
'use strict';
function toPdf(inv) { return Buffer.from('%PDF-1.4 invoice ' + inv.number); }
module.exports = { toPdf };
EOF
c b "feat: invoice PDF export"
PDF=$(git rev-parse HEAD)
fl a "docs: discount notes"
git revert --no-commit "$PDF"
c b 'Revert "feat: invoice PDF export"'
echo "// guard against concurrent writes" >> src/store.js
c a "fix: store write race"
git mv src/customer.js src/client.js
sed -i.bak "s#./customer#./client#" src/csv.js src/invoice.js && rm src/csv.js.bak src/invoice.js.bak
c b "refactor: rename customer module to client"
fl a "test: discount edge case"
sed -i.bak 's/Math.round(net \* rate \* 100)/Math.floor(net * rate * 100)/' src/tax.js && rm src/tax.js.bak
sed -i.bak 's/vat rounds to nearest cent/vat amount/; s/1.81/1.8/' test/tax.test.js && rm test/tax.test.js.bak
c b "fix: typo in tax helper"
fl a "docs: tax notes"
cat > src/payments/provider.js <<'EOF'
'use strict';
class Provider {
  charge(amount) { throw new Error('not implemented'); }
}
module.exports = { Provider };
EOF
cat > src/payments/index.js <<'EOF'
'use strict';
const { PAYMENTS_ENABLED } = require('../config');
const { Provider } = require('./provider');
function charge(amount) {
  if (!PAYMENTS_ENABLED) throw new Error('payments disabled');
  return new Provider().charge(amount);
}
module.exports = { charge };
EOF
c b "feat: payment provider abstraction (flag off)"
fl a "chore: config comment"
fl b "test: payments stub"
printf '\n## Payments\n\nPayments are supported through the provider layer. Set `PAYMENTS_ENABLED=1` to turn them on.\n' >> README.md
c b "docs: update README with payments"
fl a "docs: discount stacking notes"
fl a "docs: store notes"
fl b "chore: config comment two"
fl a "test: client smoke test"

# unmerged branch with Deniz's payment work, dated October
git checkout -q -b deniz/payments-v2
cat > src/payments/webhook.js <<'EOF'
'use strict';
function handle(evt) { return { ok: true, id: evt.id }; }
module.exports = { handle };
EOF
c b "feat: provider webhook handler"
echo "// charge request building" >> src/payments/provider.js
c b "feat: build charge requests"
cat > test/payments-v2.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
test('charge via provider returns receipt', () => {
  const { Provider } = require('../src/payments/provider');
  assert.equal(new Provider().charge(100).status, 'ok');
});
EOF
c b "test: charge receipt"
echo "// TODO provider callbacks" >> src/payments/webhook.js
c b "wip: provider callbacks"
git checkout -q main

# rest of October on main
fl a "docs: release checklist"
fl b "docs: onboarding notes"
fl a "chore: config comment three"
fl a "test: money helpers case"
fl a "docs: faq"
fl b "chore: config comment four"
fl a "docs: contributing"
fl a "test: tax regression case"
fl a "chore: config comment five"
fl a "docs: tidy"
fl a "docs: roadmap draft"
while [ $N -lt 56 ]; do
  fl a "docs: kaan notes $N"
done
# November (outside the requested period)
fl b "docs: november planning"
fl a "docs: november notes"
fl b "chore: config comment six"
