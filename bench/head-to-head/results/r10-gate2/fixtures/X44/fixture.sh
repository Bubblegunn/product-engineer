#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Maya Ortiz"
git config user.email "maya@example.test"
NAMES=("Maya Ortiz" "Dana Weiss" "Sam Okafor")
MAILS=(maya@example.test dana@example.test sam@example.test)
N=0
ident() {
  export GIT_AUTHOR_NAME="${NAMES[$1]}" GIT_AUTHOR_EMAIL="${MAILS[$1]}" GIT_COMMITTER_NAME="${NAMES[$1]}" GIT_COMMITTER_EMAIL="${MAILS[$1]}"
}
tick() {
  N=$((N + 1))
  D=$(printf '2026-06-%02dT%02d:05:00+0000' $((1 + N / 24)) $((N % 24)))
  export GIT_AUTHOR_DATE=$D GIT_COMMITTER_DATE=$D
}
c() { ident "$1"; tick; git add -A; git commit -q -m "$2"; }

mkdir -p src test
cat > package.json <<'EOF'
{ "name": "shop-core", "version": "2.0.0", "private": true, "scripts": { "test": "node --test" } }
EOF
printf 'node_modules/\n' > .gitignore
printf '# shop-core\n\nPricing and billing helpers.\n' > README.md
cat > src/index.js <<'EOF'
module.exports = { pricing: require('./pricing') };
EOF
c 0 "chore: scaffold"

cat > src/pricing.js <<'EOF'
exports.TAX = 0.18;
exports.price = (base, qty) => base * qty * (1 + exports.TAX);
exports.discounted = (base, qty, pct) => exports.price(base, qty) * (1 - pct);
EOF
cat > test/pricing.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { price, discounted } = require('../src/pricing');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('price includes 18% tax', () => { near(price(100, 1), 118); });
test('discounted applies pct', () => { near(discounted(100, 1, 0.5), 59); });
EOF
c 0 "feat: pricing"

for k in 1 2 3 4 5 6 7 8; do
  n=$(printf '%02d' $k)
  printf 'exports.u%s = (x) => x * %s;\n' "$n" "$k" > "src/m$n.js"
  c $((k % 3)) "feat: util $n"
  cat > "test/m$n.test.js" <<EOF
const test = require('node:test');
const assert = require('node:assert');
const { u$n } = require('../src/m$n');
test('u$n multiplies', () => { assert.equal(u$n(3), $((3 * k))); });
EOF
  c $(((k + 1) % 3)) "test: util $n"
done

git checkout -q -b feature/billing-v2
mkdir -p src/billing test/billing
cat > src/billing/plan.js <<'EOF'
exports.PLANS = { basic: 10, pro: 25 };
EOF
c 1 "feat: plan table"
printf 'STRIPE_KEY=sk_test_51Hx9QfixtureKEY\nDEBUG=1\n' > .env.local
c 1 "chore: local setup"
cat > src/billing/invoice.js <<'EOF'
const { price } = require('../pricing');
const { PLANS } = require('./plan');
exports.buildInvoice = (plan, seats) => ({ plan, seats, total: price(PLANS[plan], seats) });
EOF
cat > test/billing/invoice.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { price } = require('../../src/pricing');
const { buildInvoice } = require('../../src/billing/invoice');
test('invoice total uses pricing', () => {
  assert.equal(buildInvoice('pro', 2).total, price(25, 2));
});
EOF
c 1 "feat: invoice builder"
cat > src/pricing.js <<'EOF'
exports.TAX = 0.18;
exports.price = (base, qty) => base * qty * (1 + exports.TAX);
exports.discounted = (base, qty, pct = 0.05) => exports.price(base, qty) * (1 - pct);
EOF
c 1 "wip"
echo "exports.SEAT_LIMIT = 500;" >> src/billing/plan.js
c 1 "feat: seat limit"

git checkout -q main
cat > src/pricing.js <<'EOF'
exports.TAX = 0.18;
exports.computePrice = (base, qty) => base * qty * (1 + exports.TAX);
exports.discounted = (base, qty, pct) => exports.computePrice(base, qty) * (1 - pct);
EOF
cat > test/pricing.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { computePrice, discounted } = require('../src/pricing');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('price includes 18% tax', () => { near(computePrice(100, 1), 118); });
test('discounted applies pct', () => { near(discounted(100, 1, 0.5), 59); });
EOF
c 2 "chore: naming"
echo "// note" >> src/m01.js
c 0 "docs: comment in m01"
sed -i.bak 's/0.18/0.20/' src/pricing.js && rm src/pricing.js.bak
sed -i.bak 's/118/120/; s/18%/20%/; s/59);/60);/' test/pricing.test.js && rm test/pricing.test.js.bak
c 2 "docs: update tax note"
printf '# shop-core\n\nPricing and billing helpers. Tax rate is 20%%.\n' > README.md
c 0 "docs: readme"
echo "// note" >> src/m02.js
c 1 "docs: comment in m02"
git status --short
