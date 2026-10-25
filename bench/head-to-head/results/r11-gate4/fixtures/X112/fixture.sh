#!/usr/bin/env bash
set -euo pipefail
# Fixture X112: cronpeek (Node.js library). Minimum supported Node is 16 at baseline.
mkdir -p "$1"
cd "$1"
git init -q -b main
git config user.name "Marta Lindqvist"
git config user.email "marta@cronpeek.example"

AUTH=("Marta Lindqvist|marta@cronpeek.example" "Dev Patel|dev@cronpeek.example" "Jonas Albrecht|jonas@cronpeek.example")
N=0
commit() {
  local a="${AUTH[$1]}"
  N=$((N + 1))
  local ts=$((1672600000 + N * 521000))
  git add -A
  GIT_AUTHOR_NAME="${a%%|*}" GIT_AUTHOR_EMAIL="${a##*|}" \
  GIT_COMMITTER_NAME="${a%%|*}" GIT_COMMITTER_EMAIL="${a##*|}" \
  GIT_AUTHOR_DATE="$ts +0000" GIT_COMMITTER_DATE="$ts +0000" git commit -q -m "$2"
}
w() { mkdir -p "$(dirname "$1")"; cat > "$1"; }

# ---------- history starts when the minimum was Node 12 ----------
w .gitignore <<'EOF'
node_modules/
coverage/
*.log
EOF
w LICENSE <<'EOF'
MIT License

Copyright (c) 2023 cronpeek contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files, to deal in the Software
without restriction, subject to the usual MIT conditions.
EOF
w package.json <<'EOF'
{
  "name": "cronpeek",
  "version": "0.1.0",
  "description": "Parse five-field cron expressions and ask when they fire next",
  "main": "src/index.js",
  "bin": { "cronpeek": "bin/cronpeek.js" },
  "scripts": {
    "test": "node --test"
  },
  "engines": { "node": ">=12" },
  "license": "MIT"
}
EOF
w .nvmrc <<'EOF'
12
EOF
commit 0 "Initial commit: package.json, license, nvmrc"

w src/errors.js <<'EOF'
'use strict';

class CronError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CronError';
  }
}

module.exports = { CronError };
EOF
w src/parse.js <<'EOF'
'use strict';
const { CronError } = require('./errors');

const FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'dayOfMonth', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'dayOfWeek', min: 0, max: 6 },
];

function parseField(text, { name, min, max }) {
  const values = new Set();
  for (const part of text.split(',')) {
    const [range, stepText] = part.split('/');
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) {
      throw new CronError(`bad step in ${name}: ${part}`);
    }
    let lo;
    let hi;
    if (range === '*') {
      lo = min;
      hi = max;
    } else if (range.includes('-')) {
      [lo, hi] = range.split('-').map(Number);
    } else {
      lo = Number(range);
      hi = stepText === undefined ? lo : max;
    }
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < min || hi > max || lo > hi) {
      throw new CronError(`value out of range in ${name}: ${part}`);
    }
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  return values;
}

function parse(expression) {
  const parts = String(expression).trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new CronError(`expected 5 fields, got ${parts.length}`);
  }
  const parsed = { raw: parts.join(' ') };
  FIELDS.forEach((field, i) => {
    parsed[field.name] = parseField(parts[i], field);
  });
  return parsed;
}

module.exports = { parse };
EOF
commit 0 "Add cron expression parser"

w src/next.js <<'EOF'
'use strict';
const { parse } = require('./parse');
const { CronError } = require('./errors');

const MAX_LOOKAHEAD_MINUTES = 366 * 24 * 60;

function matches(parsed, date) {
  return (
    parsed.minute.has(date.getUTCMinutes()) &&
    parsed.hour.has(date.getUTCHours()) &&
    parsed.dayOfMonth.has(date.getUTCDate()) &&
    parsed.month.has(date.getUTCMonth() + 1) &&
    parsed.dayOfWeek.has(date.getUTCDay())
  );
}

// All fields must match (day-of-month AND day-of-week), unlike vixie cron.
function nextRun(expression, from = new Date()) {
  const parsed = parse(expression);
  const t = new Date(from.getTime());
  t.setUTCSeconds(0, 0);
  t.setUTCMinutes(t.getUTCMinutes() + 1);
  for (let i = 0; i < MAX_LOOKAHEAD_MINUTES; i += 1) {
    if (matches(parsed, t)) return t;
    t.setUTCMinutes(t.getUTCMinutes() + 1);
  }
  throw new CronError(`no run within a year for "${expression}"`);
}

module.exports = { nextRun, matches };
EOF
w src/index.js <<'EOF'
'use strict';
const { parse } = require('./parse');
const { nextRun, matches } = require('./next');
const { CronError } = require('./errors');

module.exports = { parse, nextRun, matches, CronError };
EOF
commit 0 "Add nextRun and the public entry point"

w test/parse.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parse, CronError } = require('../src');

test('parses a plain list and range', () => {
  const p = parse('0,30 9-11 * * 1-5');
  assert.deepStrictEqual([...p.minute], [0, 30]);
  assert.deepStrictEqual([...p.hour], [9, 10, 11]);
  assert.strictEqual(p.dayOfWeek.size, 5);
});

test('expands steps', () => {
  const p = parse('*/15 * * * *');
  assert.deepStrictEqual([...p.minute], [0, 15, 30, 45]);
});

test('rejects the wrong number of fields', () => {
  assert.throws(() => parse('* * * *'), CronError);
});

test('rejects out of range values', () => {
  assert.throws(() => parse('61 * * * *'), CronError);
  assert.throws(() => parse('* 24 * * *'), CronError);
});
EOF
w test/next.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { nextRun } = require('../src');

test('next minute for a wildcard expression', () => {
  const from = new Date(Date.UTC(2024, 0, 10, 8, 30, 20));
  assert.strictEqual(nextRun('* * * * *', from).toISOString(), '2024-01-10T08:31:00.000Z');
});

test('afternoon job rolls to the next day when already past', () => {
  const from = new Date(Date.UTC(2024, 0, 10, 17, 0, 0));
  assert.strictEqual(nextRun('0 16 * * *', from).toISOString(), '2024-01-11T16:00:00.000Z');
});

test('weekday-only job skips the weekend', () => {
  const friday = new Date(Date.UTC(2024, 0, 12, 16, 5, 0));
  assert.strictEqual(nextRun('0 16 * * 1-5', friday).toISOString(), '2024-01-15T16:00:00.000Z');
});
EOF
commit 1 "Tests for parse and nextRun"

w README.md <<'EOF'
# cronpeek

[![node](https://img.shields.io/badge/node-%3E%3D12-brightgreen)](docs/install.md)

Parse five-field cron expressions and ask when they fire next. No dependencies.

## Install

```
npm install cronpeek
```

Requires Node.js 12 or newer.

## Usage

```js
const { nextRun } = require('cronpeek');
nextRun('0 16 * * 1-5').toISOString(); // next weekday at 16:00 UTC
```

See `docs/usage.md` for the full syntax.
EOF
w docs/usage.md <<'EOF'
# Usage

## Syntax

Five fields: minute, hour, day of month, month, day of week.

| Field        | Range |
|--------------|-------|
| minute       | 0-59  |
| hour         | 0-23  |
| day of month | 1-31  |
| month        | 1-12  |
| day of week  | 0-6   |

Supported: `*`, lists (`1,15`), ranges (`9-17`), steps (`*/10`, `5-30/5`).

## Examples

- `0 16 * * 1-5` every weekday at 16:00 UTC
- `*/15 * * * *` every quarter hour
- `30 2 1 * *` 02:30 on the first of the month

All times are UTC. When both day fields are restricted, both must match.
EOF
commit 0 "README and usage docs"

w .github/workflows/ci.yml <<'EOF'
name: ci
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [12, 14, 16]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
EOF
commit 1 "CI: run tests on Node 12, 14 and 16"

w bin/cronpeek.js <<'EOF'
#!/usr/bin/env node
'use strict';
const { nextRun, CronError } = require('../src');

const expression = process.argv.slice(2).join(' ');
if (!expression) {
  console.error('usage: cronpeek "<expression>"');
  process.exit(2);
}
try {
  console.log(nextRun(expression).toISOString());
} catch (err) {
  if (err instanceof CronError) {
    console.error(`cronpeek: ${err.message}`);
    process.exit(1);
  }
  throw err;
}
EOF
chmod +x bin/cronpeek.js
commit 0 "Add cronpeek CLI"

w docs/contributing.md <<'EOF'
# Contributing

1. Fork, then `nvm use` (the `.nvmrc` file pins the Node version we develop on).
2. `npm test` must pass.
3. Add a line to `CHANGELOG.md` under **Unreleased**.

## Breaking changes

Raising the minimum Node.js version is a breaking change. Record it under
**Unreleased** in `CHANGELOG.md` with a `BREAKING:` prefix. Do not bump the
version number in `package.json` yourself: the maintainer cuts releases.
EOF
w CHANGELOG.md <<'EOF'
# Changelog

## Unreleased

## 0.1.0
- First release: `parse`, `nextRun`, `matches` and the `cronpeek` CLI.
EOF
commit 2 "Contributing guide and changelog"

w docs/install.md <<'EOF'
# Installing

cronpeek has no runtime dependencies.

```
npm install cronpeek
```

## Supported Node.js versions

Node.js 12 and newer. CI runs the suite on 12, 14 and 16.

## Using the CLI

```
npx cronpeek "*/5 * * * *"
```
EOF
commit 1 "docs: installation notes"

w examples/basic.js <<'EOF'
'use strict';
const { nextRun } = require('..');

const from = new Date(Date.UTC(2024, 5, 3, 9, 0, 0));
console.log(nextRun('30 2 1 * *', from).toISOString());
EOF
commit 0 "examples: basic usage"

w src/clone.js <<'EOF'
'use strict';

// structuredClone arrived in Node 17. Older runtimes fall back to JSON, which
// cannot represent Date or Set values.
function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

module.exports = { clone };
EOF
w test/clone.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { clone } = require('../src/clone');

test('clone returns an independent copy', () => {
  const a = { list: [1, 2, 3] };
  const b = clone(a);
  b.list.push(4);
  assert.deepStrictEqual(a.list, [1, 2, 3]);
});

test('clone keeps Set values', { skip: !('structuredClone' in globalThis) && 'structuredClone missing' }, () => {
  const b = clone({ s: new Set([1, 2]) });
  assert.ok(b.s instanceof Set);
});
EOF
commit 2 "Add clone helper with a JSON fallback for old Node"

# ---------- Node 12 dropped, minimum becomes 14 ----------
perl -pi -e 's/"node": ">=12"/"node": ">=14"/' package.json
echo 14 > .nvmrc
perl -pi -e 's/node: \[12, 14, 16\]/node: [14, 16, 18]/' .github/workflows/ci.yml
perl -pi -e 's/%3E%3D12/%3E%3D14/; s/Node.js 12 or newer/Node.js 14 or newer/' README.md
perl -pi -e 's/Node.js 12 and newer. CI runs the suite on 12, 14 and 16./Node.js 14 and newer. CI runs the suite on 14, 16 and 18./' docs/install.md
perl -pi -e 's/^## Unreleased$/## Unreleased\n- BREAKING: dropped Node.js 12./' CHANGELOG.md
commit 1 "Drop Node 12 (end of life), minimum is now 14"

w .github/workflows/release.yml <<'EOF'
name: release
on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 16
          registry-url: https://registry.npmjs.org
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
EOF
commit 2 "Add tag-triggered release workflow"

w examples/docker/Dockerfile <<'EOF'
FROM node:14-alpine
WORKDIR /app
COPY . .
ENTRYPOINT ["node", "bin/cronpeek.js"]
EOF
commit 0 "examples: Dockerfile for running the CLI in a container"

# release 1.0.0 and lockfile
perl -pi -e 's/"version": "0.1.0"/"version": "1.0.0"/' package.json
w package-lock.json <<'EOF'
{
  "name": "cronpeek",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "cronpeek",
      "version": "1.0.0",
      "license": "MIT",
      "bin": {
        "cronpeek": "bin/cronpeek.js"
      },
      "engines": {
        "node": ">=14"
      }
    }
  }
}
EOF
perl -pi -e 's/^## Unreleased$/## Unreleased\n\n## 1.0.0/' CHANGELOG.md
commit 0 "1.0.0"

# ---------- Node 14 dropped, minimum becomes 16 ----------
perl -pi -e 's/">=14"/">=16"/' package.json package-lock.json
echo 16 > .nvmrc
perl -pi -e 's/node: \[14, 16, 18\]/node: [16, 18, 20]/' .github/workflows/ci.yml
perl -pi -e 's/%3E%3D14/%3E%3D16/; s/Node.js 14 or newer/Node.js 16 or newer/' README.md
perl -pi -e 's/Node.js 14 and newer. CI runs the suite on 14, 16 and 18./Node.js 16 and newer. CI runs the suite on 16, 18 and 20./' docs/install.md
perl -pi -e 's/^## Unreleased$/## Unreleased\n- BREAKING: dropped Node.js 14./' CHANGELOG.md
commit 1 "Drop Node 14, minimum is now 16"

perl -pi -e 's/## Unreleased\n/## Unreleased\n/' CHANGELOG.md
perl -0pi -e 's/## Unreleased\n- BREAKING: dropped Node.js 14.\n\n## 1.0.0/## Unreleased\n\n## 1.1.0\n- BREAKING: dropped Node.js 14.\n\n## 1.0.0/' CHANGELOG.md
perl -pi -e 's/"version": "1.0.0"/"version": "1.1.0"/' package.json package-lock.json
commit 0 "1.1.0"

cat >> docs/usage.md <<'EOF'

## Daylight saving

cronpeek works in UTC only, so there is no daylight-saving ambiguity. Convert to
local time yourself if you need it.
EOF
commit 2 "docs: note that everything is UTC"

perl -0pi -e 's/(test\(.weekday-only job skips the weekend.)/test("month rollover for the first of the month", () => {\n  const from = new Date(Date.UTC(2024, 0, 31, 23, 0, 0));\n  assert.strictEqual(nextRun("30 2 1 * *", from).toISOString(), "2024-02-01T02:30:00.000Z");\n});\n\n$1/' test/next.test.js
commit 1 "test: month rollover for nextRun"

perl -pi -e 's/^## Unreleased$/## Unreleased\n- Fix: nextRun now rounds seconds down before searching./' CHANGELOG.md
commit 0 "changelog: note the seconds fix"
