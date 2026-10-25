#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"; cd "$1"
git init -q -b main
git config user.name "Marta Kowal"; git config user.email "marta@example.test"
A=("Marta Kowal|marta@example.test" "Dev Rao|dev@example.test" "Sam Ellis|sam@example.test")
n=0
ci(){ local msg="$1" a="${2:-$((n%3))}"; n=$((n+1)); local d nm em
  d=$(printf '2026-%02d-%02dT09:30:00+0000' $((1+n/14)) $((1+(n%14)*2)))
  IFS='|' read -r nm em <<<"${A[$a]}"
  git add -A
  GIT_AUTHOR_NAME="$nm" GIT_AUTHOR_EMAIL="$em" GIT_COMMITTER_NAME="$nm" GIT_COMMITTER_EMAIL="$em" GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$msg"; }

mkdir -p src test scripts docs .github/workflows test/fixtures
printf 'node_modules/\ndist/\n' > .gitignore
cat > package.json <<'X'
{
  "name": "ledgerline",
  "version": "0.7.2",
  "description": "Summarise CSV ledgers from the command line",
  "bin": { "ledgerline": "src/cli.js" },
  "scripts": {
    "test": "node --test",
    "build": "node scripts/build.mjs"
  },
  "engines": { "node": ">=18" },
  "license": "MIT"
}
X
echo 18 > .nvmrc
echo "# ledgerline" > README.md
ci "chore: initial package" 0

cat > src/csv.js <<'X'
'use strict';
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = lines.shift().split(',').map((h) => h.trim());
  return lines.map((l) => {
    const cells = l.split(',');
    const row = {};
    header.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
    return row;
  });
}
module.exports = { parseCsv };
X
cat > test/csv.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseCsv } = require('../src/csv');

test('parses rows by header', () => {
  const rows = parseCsv('date,amount\n2026-01-01,10\n2026-01-02,5\n');
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[1].amount, '5');
});
X
ci "feat(csv): minimal csv parser" 1

cat > src/summary.js <<'X'
'use strict';
function summarise(rows, field = 'amount') {
  let total = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const r of rows) {
    const v = Number(r[field]);
    if (Number.isNaN(v)) continue;
    total += v;
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  return { count: rows.length, total, min, max };
}
module.exports = { summarise };
X
cat > test/summary.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { summarise } = require('../src/summary');

test('totals the amount column', () => {
  const s = summarise([{ amount: '10' }, { amount: '5.5' }]);
  assert.strictEqual(s.total, 15.5);
  assert.strictEqual(s.max, 10);
});
X
ci "feat(summary): count, total, min, max" 2

cat > src/format.js <<'X'
'use strict';
function format(summary, style = 'plain') {
  if (style === 'json') return JSON.stringify(summary);
  return `rows=${summary.count} total=${summary.total} min=${summary.min} max=${summary.max}`;
}
module.exports = { format };
X
cat > src/rates.js <<'X'
'use strict';
// Parses an exchange-rate payload as returned by a rates endpoint.
async function parseRates(response) {
  const body = await response.json();
  return Object.fromEntries(Object.entries(body).map(([k, v]) => [k.toUpperCase(), Number(v)]));
}
module.exports = { parseRates };
X
cat > test/rates.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseRates } = require('../src/rates');

test('upper-cases currency codes', async () => {
  const rates = await parseRates(new Response('{"usd":1.1,"gbp":0.85}'));
  assert.deepStrictEqual(rates, { USD: 1.1, GBP: 0.85 });
});

// Flaky on Node 18 (Response.json() body handling); re-enable when we drop Node 18.
test('rejects non-numeric rates', { skip: 'fails on Node 18, re-enable when Node 18 is dropped' }, async () => {
  const rates = await parseRates(new Response('{"usd":"abc"}'));
  assert.ok(Number.isNaN(rates.USD));
});
X
ci "feat(rates): parse exchange-rate payloads" 1

cat > src/cli.js <<'X'
#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const { parseCsv } = require('./csv');
const { summarise } = require('./summary');
const { format } = require('./format');

function main(argv) {
  const file = argv[2];
  if (!file) {
    console.error('usage: ledgerline FILE [--json]');
    return 2;
  }
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  console.log(format(summarise(rows), argv.includes('--json') ? 'json' : 'plain'));
  return 0;
}
if (require.main === module) process.exitCode = main(process.argv);
module.exports = { main };
X
cat > test/format.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { format } = require('../src/format');

test('plain format', () => {
  assert.strictEqual(format({ count: 1, total: 2, min: 2, max: 2 }), 'rows=1 total=2 min=2 max=2');
});
X
printf 'date,amount\n2026-01-01,10\n2026-01-02,5\n' > test/fixtures/sample.csv
ci "feat(cli): ledgerline command" 0

cat > scripts/build.mjs <<'X'
// Produces dist/manifest.json describing the build target.
import { mkdirSync, writeFileSync } from 'node:fs';

export const TARGET = 'node18';

export function manifest() {
  return { name: 'ledgerline', target: TARGET };
}

if (process.argv[1] && process.argv[1].endsWith('build.mjs')) {
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/manifest.json', JSON.stringify(manifest(), null, 2));
}
X
cat > test/build.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');

test('build manifest names the compile target', async () => {
  const { manifest } = await import('../scripts/build.mjs');
  assert.strictEqual(manifest().target, 'node18');
});
X
ci "build: manifest with compile target" 2

cat > Dockerfile <<'X'
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
ENTRYPOINT ["node", "src/cli.js"]
X
cat > .github/workflows/ci.yml <<'X'
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
X
cat > .github/workflows/release.yml <<'X'
name: release
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm test
      - run: node scripts/build.mjs
X
ci "ci: test matrix, release workflow and Dockerfile" 1

cat > README.md <<'X'
# ledgerline

Summarise CSV ledgers from the command line.

    npx ledgerline ledger.csv --json

Requires Node 18 or newer. Run the tests with `npm test`.
X
cat > docs/install.md <<'X'
# Installing

Node 18 or newer is required. Install globally with `npm i -g ledgerline`
or run it from the Docker image (`docker build -t ledgerline .`).
X
cat > docs/contributing.md <<'X'
# Contributing

Use Node 18.x for development (`nvm use` reads `.nvmrc`). The CI matrix
runs the suite on every supported version; keep it green before opening a PR.
X
cat > CHANGELOG.md <<'X'
# Changelog

## 0.7.2
- Fix header trimming in the csv parser.

## 0.7.0
- Add exchange-rate parsing.

## 0.5.0
- Dropped Node 16. Minimum is now Node 18.

## 0.1.0
- First release.
X
ci "docs: readme, install, contributing, changelog" 2

for i in $(seq 1 14); do
  if [ $((i%2)) -eq 0 ]; then
    printf 'date,amount\n2026-02-%02d,%d\n2026-02-%02d,%d\n' $i $((i*3)) $((i+1)) $((i+7)) > test/fixtures/ledger_$i.csv
    ci "test: add fixture ledger_$i.csv" $((i%3))
  else
    printf -- '- note %d: keep the parser dependency-free.\n' $i >> docs/design-notes.md
    ci "docs: design note $i" $((i%3))
  fi
done
