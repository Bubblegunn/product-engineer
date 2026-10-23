#!/bin/bash
set -e
cd "$1"
git init -q -b main
git config user.name "Owner"; git config user.email "owner@example.com"
cm() { GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"; }
mkdir -p src test
cat > package.json <<'J'
{ "name": "notes-app", "version": "1.3.0", "private": true, "scripts": { "test": "node --test" } }
J
cat > src/version.js <<'J'
exports.VERSION = '1.3.0';
J
cat > src/config.js <<'J'
exports.DEFAULT_PAGE_SIZE = 20;
J
cat > src/search.js <<'J'
// Linear scan over all notes.
exports.search = (notes, q) => notes.filter((n) => n.text.includes(q));
J
cat > CHANGELOG.md <<'J'
# Changelog

## 1.3.0 - 2026-08-01
- Saved searches: keep a search and run it again with one click.
J
printf '# Notes app\n\nSearch your notes. Results come in pages.\n' > README.md
cat > test/app.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { VERSION } = require('../src/version');
const { DEFAULT_PAGE_SIZE } = require('../src/config');
const { search } = require('../src/search');
test('VERSION matches package.json', () => assert.strictEqual(VERSION, require('../package.json').version));
test('page size', () => assert.strictEqual(DEFAULT_PAGE_SIZE, 20));
test('search finds text', () => assert.deepStrictEqual(search([{ text: 'abc' }, { text: 'x' }], 'b'), [{ text: 'abc' }]));
J
git add -A; cm "2026-08-01T09:00:00" "release: 1.3.0"
git tag v1.3.0
cat > src/search.js <<'J'
// Lower-cased index built once, then scanned.
const cache = new WeakMap();
exports.search = (notes, q) => {
  let idx = cache.get(notes);
  if (!idx) { idx = notes.map((n) => n.text); cache.set(notes, idx); }
  return notes.filter((n, i) => idx[i].includes(q));
};
J
git add -A; cm "2026-08-10T09:00:00" "perf: faster search"
printf '# Notes app\n\nSearch your notes. Results come in pages.\n\nSee CHANGELOG.md for releases.\n' > README.md
echo 'exports.DEFAULT_PAGE_SIZE = 50;' > src/config.js
sed -i.bak 's/DEFAULT_PAGE_SIZE, 20/DEFAULT_PAGE_SIZE, 50/' test/app.test.js && rm test/app.test.js.bak
git add -A; cm "2026-08-12T09:00:00" "docs: point readme to the changelog"
echo "exports.MSG_EMPTY = 'Nothing found';" >> src/config.js
git add -A; cm "2026-08-14T09:00:00" "fix: add empty-result message"
git checkout -q -b export-button
echo "exports.exportAll = (notes) => notes.map((n) => n.text).join('\n');" > src/export.js
git add -A; cm "2026-08-15T09:00:00" "feat: export button"
git checkout -q main
