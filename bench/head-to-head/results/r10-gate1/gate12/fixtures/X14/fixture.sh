#!/bin/bash
set -e
cd "$1"
git init -q -b main
git config user.name "Owner"; git config user.email "owner@example.com"
cm() { GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"; }
mkdir -p src test
cat > package.json <<'J'
{ "name": "url-kit", "version": "0.4.0", "private": true, "scripts": { "test": "node --test" } }
J
cat > src/slugify.js <<'J'
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
module.exports = { slugify };
J
cat > src/query.js <<'J'
function parseQuery(qs) {
  const out = {};
  for (const part of qs.split('&')) {
    const [k, v] = part.split('=');
    out[k] = v;
  }
  return out;
}
module.exports = { parseQuery };
J
cat > test/slugify.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { slugify } = require('../src/slugify');
test('simple', () => assert.strictEqual(slugify('Hello World'), 'hello-world'));
test('trims', () => assert.strictEqual(slugify('  spaces  '), 'spaces'));
test('collapses', () => assert.strictEqual(slugify('a--b'), 'a-b'));
test('accents', () => assert.strictEqual(slugify('Crème Brûlée!'), 'creme-brulee'));
J
cat > test/query.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { parseQuery } = require('../src/query');
test('single keys', () => assert.deepStrictEqual(parseQuery('a=1&b=2'), { a: '1', b: '2' }));
test('repeated key becomes list', () => assert.deepStrictEqual(parseQuery('a=1&a=2'), { a: ['1', '2'] }));
test('empty value', () => assert.deepStrictEqual(parseQuery('a='), { a: '' }));
J
git add -A; cm "2026-09-10T10:00:00" "feat: slugify and query helpers"
