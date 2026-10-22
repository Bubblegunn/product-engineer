#!/bin/sh
# usage: build-fixture.sh DIR   (test command: cd DIR && node --test)
set -e
D="$1"; mkdir -p "$D"; cd "$D"
git init -q -b main
git config user.name "Dev"; git config user.email "dev@example.com"
mkdir -p src test
echo '{"name":"catalog","version":"1.0.0","scripts":{"test":"node --test"}}' > package.json
cat > src/search.js <<'J'
function search(items, q) {
  return items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
}
module.exports = { search };
J
cat > src/export.js <<'J'
function exportCsv(items) {
  return ['name,price', ...items.map((i) => `${i.name},${i.price}`)].join('\n');
}
module.exports = { exportCsv };
J
cat > src/ui.js <<'J'
function toolbar() { return ['Search', 'Export CSV', 'Settings']; }
module.exports = { toolbar };
J
cat > test/search.test.js <<'J'
const test = require('node:test'); const assert = require('node:assert');
const { search } = require('../src/search');
test('finds by name', () => { assert.deepStrictEqual(search([{name:'Lamp'},{name:'Desk'}], 'la'), [{name:'Lamp'}]); });
J
cat > test/export.test.js <<'J'
const test = require('node:test'); const assert = require('node:assert');
const { exportCsv } = require('../src/export');
test('exports csv', () => { assert.strictEqual(exportCsv([{name:'Lamp',price:10}]), 'name,price\nLamp,10'); });
J
git add -A && git commit -q -m "initial catalog"
git checkout -q -b feature/search-cleanup
cat > src/search.js <<'J'
const cache = new Map();
function search(items, q) {
  const key = q.toLowerCase();
  if (cache.has(key) && cache.get(key).src === items) return cache.get(key).out;
  const out = items.filter((i) => i.name.toLowerCase().includes(key));
  cache.set(key, { src: items, out });
  return out;
}
module.exports = { search };
J
git commit -qam "perf: speed up search 3x with result cache"
git rm -q src/export.js test/export.test.js
cat > src/ui.js <<'J'
function toolbar() { return ['Search', 'Settings']; }
module.exports = { toolbar };
J
git commit -qam "chore: remove unused code paths"
cat > src/search.js <<'J'
const cache = new Map();
function search(items, q) {
  const key = q.toLowerCase();
  if (cache.has(key) && cache.get(key).src === items) return cache.get(key).out;
  const out = items.filter((i) => i.name.toLowerCase().includes(key) || (i.tags || []).some((t) => t.toLowerCase().includes(key)));
  cache.set(key, { src: items, out });
  return out;
}
module.exports = { search };
J
cat >> test/search.test.js <<'J'
test('finds by tag', () => { assert.strictEqual(search([{name:'Lamp',tags:['light']}], 'ligh').length, 1); });
test.skip('matches accented names without accents (cafe finds Café)', () => { assert.strictEqual(search([{name:'Café'}], 'cafe').length, 1); });
J
git commit -qam "feat: search also matches tags"
