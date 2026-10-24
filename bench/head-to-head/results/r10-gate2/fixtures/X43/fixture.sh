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
  D=$(printf '2026-05-%02dT%02d:45:00+0000' $((1 + N / 24)) $((N % 24)))
  export GIT_AUTHOR_DATE=$D GIT_COMMITTER_DATE=$D
}
c() { ident "$1"; tick; git add -A; git commit -q -m "$2"; }

mkdir -p src test
cat > package.json <<'EOF'
{ "name": "billing-lib", "version": "0.9.1", "private": true, "scripts": { "test": "node --test" } }
EOF
printf '# billing-lib\n\nInvoice and tax helpers.\n' > README.md
printf '# Changelog\n\n## Unreleased\n\n## 0.9.1\n- Tax helper\n' > CHANGELOG.md
cat > src/index.js <<'EOF'
module.exports = { invoice: require('./invoice'), tax: require('./tax') };
EOF
c 0 "chore: scaffold"

cat > src/invoice.js <<'EOF'
exports.lineTotal = (price, qty) => price * qty;
EOF
cat > test/invoice.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { lineTotal } = require('../src/invoice');
test('line total of whole numbers', () => { assert.equal(lineTotal(5, 2), 10); });
EOF
c 0 "feat: invoice line totals"

cat > src/tax.js <<'EOF'
// tax in integer cents, rate as a fraction
exports.taxCents = (cents, rate) => Math.round(cents * rate);
EOF
cat > test/tax.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { taxCents } = require('../src/tax');
test('tax on 1000 cents at 20%', () => { assert.equal(taxCents(1000, 0.2), 200); });
EOF
c 2 "feat: tax in cents"

for k in 1 2 3 4 5 6 7 8; do
  n=$(printf '%02d' $k)
  printf 'exports.h%s = (x) => x - %s;\n' "$n" "$k" > "src/m$n.js"
  c $((k % 3)) "feat: unit $n"
  cat > "test/m$n.test.js" <<EOF
const test = require('node:test');
const assert = require('node:assert');
const { h$n } = require('../src/m$n');
test('h$n subtracts', () => { assert.equal(h$n(10), $((10 - k))); });
EOF
  c $(((k + 1) % 3)) "test: unit $n"
done

git checkout -q -b dana/rounding

cat > test/rounding.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { lineTotal } = require('../src/invoice');
const { taxCents } = require('../src/tax');
test('line total rounds in cents', () => { assert.equal(lineTotal(0.1, 3), 0.3); });
test('tax uses half-even rounding', () => {
  assert.equal(taxCents(250, 0.01), 2);
  assert.equal(taxCents(350, 0.01), 4);
});
EOF
c 1 "test: rounding cases"
A=$(git rev-parse HEAD)

cat > src/invoice.js <<'EOF'
exports.lineTotal = (price, qty) => Math.round(price * 100 * qty) / 100;
EOF
c 1 "fix: round line totals"
B=$(git rev-parse HEAD)

cat > src/tax.js <<'EOF'
// tax in integer cents, rate as a fraction; halves round to the even cent
exports.taxCents = (cents, rate) => {
  const x = cents * rate;
  const f = Math.floor(x);
  if (Math.abs(x - f - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
};
EOF
c 1 "refactor: money helpers"

printf '# Changelog\n\n## Unreleased\n- Fixed invoice and tax rounding\n\n## 0.9.1\n- Tax helper\n' > CHANGELOG.md
c 1 "docs: changelog"

git checkout -q main

for k in 1 2 3; do
  echo "// reviewed $k" >> "src/m0$k.js"
  c 2 "chore: lint m0$k"
done
ident 2; tick
git cherry-pick "$A" >/dev/null
for k in 4 5 6; do
  echo "// reviewed $k" >> "src/m0$k.js"
  c 0 "chore: lint m0$k"
done
ident 2; tick
git cherry-pick "$B" >/dev/null
printf '# billing-lib\n\nInvoice and tax helpers (integer cents).\n' > README.md
c 0 "docs: readme"
git status --short
