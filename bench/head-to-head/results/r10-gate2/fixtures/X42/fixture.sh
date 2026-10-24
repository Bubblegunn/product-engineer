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
  D=$(printf '2026-04-%02dT%02d:30:00+0000' $((1 + N / 24)) $((N % 24)))
  export GIT_AUTHOR_DATE=$D GIT_COMMITTER_DATE=$D
}
c() { ident "$1"; tick; git add -A; git commit -q -m "$2"; }

mkdir -p src test
cat > package.json <<'EOF'
{ "name": "notekeeper", "version": "1.2.0", "private": true, "scripts": { "test": "node --test" } }
EOF
printf '# notekeeper\n\nA tiny notes toolkit: parse, search, import.\n' > README.md
cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased
- Dark mode
- Single sign-on
- Bulk export

## 1.2.0
- CSV import
EOF
cat > src/index.js <<'EOF'
module.exports = { parser: require('./parser'), search: require('./search') };
EOF
c 0 "chore: scaffold"

cat > src/parser.js <<'EOF'
exports.parse = (s) => s.split('\n').filter(Boolean);
EOF
cat > test/parser.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/parser');
test('parses lines', () => { assert.deepEqual(parse('a\nb'), ['a', 'b']); });
test('empty input gives empty list', () => { assert.deepEqual(parse(''), []); });
EOF
c 0 "feat: line parser"

cat > src/search.js <<'EOF'
exports.search = (items, q) => items.filter((i) => i.includes(q));
EOF
c 1 "feat: search"

for k in 1 2 3 4 5 6 7 8; do
  n=$(printf '%02d' $k)
  printf 'exports.g%s = (x) => x + %s;\n' "$n" "$k" > "src/m$n.js"
  c $((k % 3)) "feat: helper $n"
  cat > "test/m$n.test.js" <<EOF
const test = require('node:test');
const assert = require('node:assert');
const { g$n } = require('../src/m$n');
test('g$n adds', () => { assert.equal(g$n(1), $((1 + k))); });
EOF
  c $(((k + 2) % 3)) "test: helper $n"
done

cat > src/import.js <<'EOF'
exports.importCsv = (t) => t.trim().split('\n').map((r) => r.split(','));
EOF
cat > test/import.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { importCsv } = require('../src/import');
test('imports csv', () => { assert.deepEqual(importCsv('a,b\nc,d'), [['a', 'b'], ['c', 'd']]); });
EOF
c 1 "feat: CSV import"
git tag v1.2.0

# --- unmerged SSO branch ---
git checkout -q -b feature/sso
cat > src/sso.js <<'EOF'
exports.login = (token) => ({ user: token.split(':')[0] });
EOF
c 2 "feat: sso login stub"
cat > test/sso.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { login } = require('../src/sso');
test('sso login', () => { assert.equal(login('ann:x').user, 'ann'); });
EOF
c 2 "test: sso login"
git checkout -q main

# --- tags branch, merged later ---
git checkout -q -b feature/tags v1.2.0
cat > src/tags.js <<'EOF'
exports.byTag = (items, tag) => items.filter((i) => (i.tags || []).includes(tag));
EOF
c 1 "wip"
cat > test/tags.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { byTag } = require('../src/tags');
test('filters by tag', () => { assert.equal(byTag([{ tags: ['a'] }, { tags: [] }], 'a').length, 1); });
EOF
c 1 "wip 2"
git checkout -q main

# --- main after the tag ---
cat > src/export.js <<'EOF'
exports.exportAll = (items) => 'id,titel\n' + items.map((t, i) => `${i},${t}`).join('\n');
EOF
cat > test/export.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { exportAll } = require('../src/export');
test('exports all', () => { assert.equal(exportAll(['x']), 'id,titel\n0,x'); });
EOF
c 0 "feat: bulk export"
cat > src/theme.js <<'EOF'
exports.theme = 'dark';
EOF
c 2 "feat: dark mode"
mkdir -p .github/workflows
printf 'name: ci\non: [push]\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: node --test\n' > .github/workflows/ci.yml
c 1 "ci: add workflow"

ident 0; tick
git revert --no-edit "$(git log --format=%h --grep='dark mode' -n1)" >/dev/null
ident 0; tick
git revert --no-edit "$(git log --format=%h --grep='feat: bulk export' -n1)" >/dev/null

for k in 1 2 3; do
  echo "// lint pass $k" >> "src/m0$k.js"
  c 2 "chore: lint m0$k"
done

cat > src/export.js <<'EOF'
exports.exportAll = (items) => 'id,title\n' + items.map((t, i) => `${i},${t}`).join('\n');
EOF
cat > test/export.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { exportAll } = require('../src/export');
test('exports all', () => { assert.equal(exportAll(['x']), 'id,title\n0,x'); });
EOF
c 0 "fix: typo in export header"

cat > src/parser.js <<'EOF'
const split = (s) => s.split('\n');
const clean = (rows) => rows.filter(Boolean);
exports.parse = (s) => {
  if (!s) throw new TypeError('empty input');
  return clean(split(s));
};
EOF
cat > test/parser.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src/parser');
test('parses lines', () => { assert.deepEqual(parse('a\nb'), ['a', 'b']); });
test('empty input throws', () => { assert.throws(() => parse(''), TypeError); });
EOF
c 1 "refactor: split parser"

ident 0; tick
git merge -q --no-ff feature/tags -m "Merge branch 'feature/tags'"

sed -i.bak 's/"version": "1.2.0"/"version": "1.3.0"/' package.json && rm package.json.bak
c 0 "chore: bump version to 1.3.0"
printf '# notekeeper\n\nA tiny notes toolkit: parse, search, import, export, tags.\n' > README.md
c 2 "docs: readme feature list"
git status --short
