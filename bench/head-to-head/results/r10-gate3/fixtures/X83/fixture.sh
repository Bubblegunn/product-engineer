#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Priya Nair"
git config user.email "priya@pagerkit.example"
N=0
commit() {
  N=$((N+1))
  local d
  d=$(printf '2026-05-%02dT%02d:00:00Z' $((1+N/8)) $((9+N%8)))
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}
mkdir -p src/fmt test

cat > package.json <<'EOF'
{
  "name": "pager-kit",
  "version": "0.7.2",
  "scripts": { "test": "node --test" }
}
EOF
printf 'node_modules/\n' > .gitignore
cat > README.md <<'EOF'
# pager-kit

Slice a list into pages and print one.

## Usage

    run(['--page', '2', '--page-size', '5'], items)
EOF
git add -A; commit "chore: skeleton"

for i in 1 2 3 4 5 6; do
  cat > "src/fmt/fmt$i.js" <<EOF
'use strict';
module.exports = function fmt$i(s) {
  return '[$i] ' + s;
};
EOF
  cat > "test/fmt$i.test.js" <<EOF
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fmt = require('../src/fmt/fmt$i');

test('fmt$i prefixes', () => {
  assert.strictEqual(fmt('x'), '[$i] x');
});
EOF
  git add -A; commit "feat(fmt): add fmt$i"
done

cat > src/paginate.js <<'EOF'
'use strict';
function pageCount(total, size) {
  return Math.floor(total / size);
}
function slice(items, page, size) {
  return items.slice((page - 1) * size, page * size);
}
module.exports = { pageCount, slice };
EOF
cat > test/paginate.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { pageCount, slice } = require('../src/paginate');

test('exact multiple', () => {
  assert.strictEqual(pageCount(10, 5), 2);
});
test('empty list', () => {
  assert.strictEqual(pageCount(0, 5), 0);
});
test('slice second page', () => {
  assert.deepStrictEqual(slice([1, 2, 3, 4, 5, 6], 2, 4), [5, 6]);
});
EOF
git add -A; commit "feat: pagination helpers"

cat > src/cli.js <<'EOF'
'use strict';
const { pageCount, slice } = require('./paginate');

function opt(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

function run(argv, items) {
  const size = Number(opt(argv, '--page-size')) || 10;
  const page = Number(opt(argv, '--page')) || 1;
  // pageCount rounds down, so add one page when there is a remainder
  const pages = pageCount(items.length, size) + (items.length % size ? 1 : 0);
  const rows = slice(items, page, size);
  return [`Page ${page} of ${pages}`, ...rows].join('\n');
}
module.exports = { run };
EOF
cat > test/cli.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { run } = require('../src/cli');

const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];

test('header reports three pages for 11 items of 5', () => {
  assert.strictEqual(run(['--page-size', '5'], items).split('\n')[0], 'Page 1 of 3');
});
test('second page rows', () => {
  assert.deepStrictEqual(run(['--page', '2', '--page-size', '5'], items).split('\n').slice(1), ['f', 'g', 'h', 'i', 'j']);
});
EOF
git add -A; commit "feat: cli runner"
printf '\n## Notes\n\nPage size defaults to 10.\n' >> README.md
git add -A; commit "docs: page size default"

# ---- messy working tree: nothing staged ----
# the fix (paginate.js + test + the workaround hunk in cli.js)
sed -i.bak 's/Math.floor(total \/ size)/Math.ceil(total \/ size)/' src/paginate.js && rm src/paginate.js.bak
cat >> test/paginate.test.js <<'EOF'
test('partial last page counts', () => {
  assert.strictEqual(pageCount(11, 5), 3);
});
EOF
# cli.js: fix hunk (drop workaround) + feature hunks (--json)
cat > src/cli.js <<'EOF'
'use strict';
const { pageCount, slice } = require('./paginate');
const { formatJson } = require('./format-json');

function opt(argv, name) {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
}

function run(argv, items) {
  const size = Number(opt(argv, '--page-size')) || 10;
  const page = Number(opt(argv, '--page')) || 1;
  const pages = pageCount(items.length, size);
  const rows = slice(items, page, size);
  if (argv.includes('--json')) return formatJson({ page, pages, rows });
  return [`Page ${page} of ${pages}`, ...rows].join('\n');
}
module.exports = { run };
EOF
# the feature
cat > src/format-json.js <<'EOF'
'use strict';
function formatJson(page) {
  return JSON.stringify(page, null, 2);
}
module.exports = { formatJson };
EOF
cat > test/format-json.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { formatJson } = require('../src/format-json');
const { run } = require('../src/cli');

test('formatJson pretty prints', () => {
  assert.strictEqual(formatJson({ a: 1 }), '{\n  "a": 1\n}');
});
test('--json prints page, pages and rows', () => {
  const out = JSON.parse(run(['--json', '--page-size', '2'], ['a', 'b', 'c']));
  assert.deepStrictEqual(out, { page: 1, pages: 2, rows: ['a', 'b'] });
});
EOF
cat >> README.md <<'EOF'

## JSON output

Pass `--json` to print `{ page, pages, rows }` as JSON instead of text.
EOF
# local / generated, untracked
mkdir -p .vscode dist
printf '{\n  "terminal.integrated.cwd": "/Users/priya/code/pager-kit",\n  "files.watcherExclude": { "dist/**": true }\n}\n' > .vscode/settings.json
printf '/* bundled cli */\n' > dist/cli.bundle.js
