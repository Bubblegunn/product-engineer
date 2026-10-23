#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Mina Okafor"
git config user.email "mina@example.com"
c() { export GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1"; git add -A; git commit -q -m "$2"; }
mkdir -p src test

cat > package.json <<'EOF'
{
  "name": "csvlite",
  "version": "2.5.0",
  "main": "src/index.js",
  "scripts": { "test": "node --test" }
}
EOF
cat > README.md <<'EOF'
# csvlite

Tiny CSV reader and writer.

    const { parse, stringify } = require('csvlite');
    parse('a, b\n');            // [['a', 'b']]
    stringify([['a', 'b']]);    // 'a,b\n'
EOF
cat > src/index.js <<'EOF'
'use strict';
function parse(text, opts = {}) {
  const trim = opts.trim !== false;
  return text.split('\n').filter((l) => l.length).map((l) => l.split(',').map((c) => (trim ? c.trim() : c)));
}
function stringify(rows) { return rows.map((r) => r.join(',')).join('\n') + '\n'; }
module.exports = { parse, stringify };
EOF
cat > test/csv.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { parse, stringify } = require('../src');

test('parse trims cells by default', () => {
  assert.deepStrictEqual(parse('a, b\n'), [['a', 'b']]);
});
test('parse keeps spaces with trim:false', () => {
  assert.deepStrictEqual(parse('a, b\n', { trim: false }), [['a', ' b']]);
});
test('stringify joins rows', () => {
  assert.strictEqual(stringify([['a', 'b']]), 'a,b\n');
});
EOF
c 2026-03-02T09:00:00 "release 2.5.0"
git tag v2.5.0

# split modules; trim default flips quietly
cat > src/read.js <<'EOF'
'use strict';
function parse(text, opts = {}) {
  const trim = opts.trim === true;
  return text.split('\n').filter((l) => l.length).map((l) => l.split(',').map((c) => (trim ? c.trim() : c)));
}
module.exports = { parse };
EOF
cat > src/write.js <<'EOF'
'use strict';
function stringify(rows) { return rows.map((r) => r.join(',')).join('\n') + '\n'; }
module.exports = { stringify };
EOF
cat > src/index.js <<'EOF'
'use strict';
module.exports = { ...require('./read'), ...require('./write') };
EOF
cat > test/csv.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { parse, stringify } = require('../src');

test('parse trims cells with trim:true', () => {
  assert.deepStrictEqual(parse('a, b\n', { trim: true }), [['a', 'b']]);
});
test('parse keeps spaces by default', () => {
  assert.deepStrictEqual(parse('a, b\n'), [['a', ' b']]);
});
test('stringify joins rows', () => {
  assert.strictEqual(stringify([['a', 'b']]), 'a,b\n');
});
EOF
c 2026-03-04T09:00:00 "refactor: split index into read and write modules"

# rename parse -> parseCsv, keep deprecated alias
cat > src/read.js <<'EOF'
'use strict';
function parseCsv(text, opts = {}) {
  const trim = opts.trim === true;
  return text.split('\n').filter((l) => l.length).map((l) => l.split(',').map((c) => (trim ? c.trim() : c)));
}
function parse(text, opts) {
  console.warn('csvlite: parse() is deprecated, use parseCsv()');
  return parseCsv(text, opts);
}
module.exports = { parseCsv, parse };
EOF
sed -i.bak "s/{ parse, stringify }/{ parseCsv, parse, stringify }/; s/parse(/parseCsv(/g" test/csv.test.js && rm test/csv.test.js.bak
cat >> test/csv.test.js <<'EOF'
test('parse is an alias of parseCsv', () => {
  assert.deepStrictEqual(parse('a,b\n'), parseCsv('a,b\n'));
});
EOF
c 2026-03-06T09:00:00 "feat: add parseCsv"

# stringify -> toCsv (old name removed)
cat > src/write.js <<'EOF'
'use strict';
function toCsv(rows) { return rows.map((r) => r.join(',')).join('\n') + '\n'; }
module.exports = { toCsv };
EOF
sed -i.bak "s/stringify/toCsv/g" test/csv.test.js && rm test/csv.test.js.bak
c 2026-03-09T09:00:00 "refactor: name writer toCsv"

# quoted fields, then reverted
cat > src/read.js <<'EOF'
'use strict';
function parseCsv(text, opts = {}) {
  const trim = opts.trim === true;
  return text.split('\n').filter((l) => l.length).map((l) => l.split(',').map((c) => (trim ? c.trim() : c).replace(/^"(.*)"$/, '$1')));
}
function parse(text, opts) {
  console.warn('csvlite: parse() is deprecated, use parseCsv()');
  return parseCsv(text, opts);
}
module.exports = { parseCsv, parse };
EOF
c 2026-03-10T09:00:00 "feat: quoted fields"
Q=$(git rev-parse HEAD)
git revert --no-edit "$Q" >/dev/null
GIT_COMMITTER_DATE=2026-03-11T09:00:00 git commit -q --amend --no-edit --date=2026-03-11T09:00:00

# header option
cat > src/read.js <<'EOF'
'use strict';
function parseCsv(text, opts = {}) {
  const trim = opts.trim === true;
  const rows = text.split('\n').filter((l) => l.length).map((l) => l.split(',').map((c) => (trim ? c.trim() : c)));
  if (opts.header) {
    const [h, ...rest] = rows;
    return rest.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]])));
  }
  return rows;
}
function parse(text, opts) {
  console.warn('csvlite: parse() is deprecated, use parseCsv()');
  return parseCsv(text, opts);
}
module.exports = { parseCsv, parse };
EOF
cat >> test/csv.test.js <<'EOF'
test('header option returns objects', () => {
  assert.deepStrictEqual(parseCsv('a,b\n1,2\n', { header: true }), [{ a: '1', b: '2' }]);
});
EOF
c 2026-03-13T09:00:00 "feat: header option"

cat > README.md <<'EOF'
# csvlite

Tiny CSV reader and writer.

    const { parseCsv, toCsv } = require('csvlite');
    parseCsv('a,b\n1,2\n', { header: true });  // [{ a: '1', b: '2' }]
    toCsv([['a', 'b']]);                       // 'a,b\n'

## Upgrading to 3.0

Drop-in upgrade: no breaking changes. Quoted fields are supported.
EOF
c 2026-03-16T09:00:00 "docs: update readme for 3.0"

sed -i.bak 's/"version": "2.5.0"/"version": "3.0.0"/' package.json && rm package.json.bak
c 2026-03-17T09:00:00 "chore: release 3.0.0"
