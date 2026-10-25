#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Ines Duarte"; git config user.email "ines@example.com"
N=0
cm() {
  N=$((N+1))
  local d; d=$(printf "2025-05-%02dT09:%02d:00Z" $((1+N/2)) $((N%60)))
  case "$1" in
    1) export GIT_AUTHOR_NAME="Ines Duarte" GIT_AUTHOR_EMAIL="ines@example.com";;
    2) export GIT_AUTHOR_NAME="Jonas Berg" GIT_AUTHOR_EMAIL="jonas@example.com";;
    3) export GIT_AUTHOR_NAME="Aisha Rahman" GIT_AUTHOR_EMAIL="aisha@example.com";;
  esac
  export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
  export GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d"
  git add -A; git commit -q -m "$2"
}
mkdir -p src test docs scripts .github/workflows
printf 'node_modules/\n.env\ndata/\n' > .gitignore
cat > package.json <<'X'
{
  "name": "linkwatch",
  "version": "2.3.0",
  "private": true,
  "description": "Watches a list of URLs and records when they go down.",
  "main": "src/server.js",
  "engines": { "node": ">=16.14" },
  "scripts": {
    "start": "node src/server.js",
    "prestart": "node scripts/check-node.js",
    "test": "node --test"
  }
}
X
cm 1 "chore: package skeleton"
cat > src/config.js <<'X'
'use strict';

module.exports = function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 8080),
    intervalMs: Number(env.CHECK_INTERVAL_MS || 60000),
    requestTimeoutMs: Number(env.REQUEST_TIMEOUT_MS || 5000),
    dataFile: env.DATA_FILE || 'data/results.json',
    dbUrl: env.DATABASE_URL || 'postgres://linkwatch:changeme-local@localhost:5432/linkwatch',
  };
};
X
cm 1 "feat: config from environment"
cat > src/checker.js <<'X'
'use strict';

async function check(url, timeoutMs, fetchImpl = fetch) {
  const started = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: ctl.signal });
    return { url, ok: res.status < 400, status: res.status, ms: Date.now() - started };
  } catch (err) {
    return { url, ok: false, status: 0, ms: Date.now() - started, error: String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { check };
X
cm 1 "feat: url checker"
cat > src/store.js <<'X'
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function load(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function append(file, record, keep = 500) {
  const rows = load(file);
  rows.push(record);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(rows.slice(-keep)));
}

module.exports = { load, append };
X
cm 2 "feat: json file store"
cat > src/server.js <<'X'
'use strict';
const http = require('node:http');
const loadConfig = require('./config');
const store = require('./store');
const { check } = require('./checker');

const cfg = loadConfig();
const targets = (process.env.TARGETS || '').split(',').filter(Boolean);

async function sweep() {
  for (const url of targets) {
    store.append(cfg.dataFile, await check(url, cfg.requestTimeoutMs));
  }
}

http
  .createServer((req, res) => {
    if (req.url === '/healthz') return res.end('ok');
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(store.load(cfg.dataFile)));
  })
  .listen(cfg.port, () => {
    console.log('linkwatch listening on', cfg.port);
    setInterval(sweep, cfg.intervalMs);
  });
X
cm 2 "feat: http server and sweep loop"
cat > scripts/check-node.js <<'X'
'use strict';

const MIN_MAJOR = 18;

function check(version = process.versions.node) {
  const major = Number(version.split('.')[0]);
  if (major < MIN_MAJOR) {
    throw new Error(`linkwatch requires Node ${MIN_MAJOR} or newer, found ${version}`);
  }
  return major;
}

module.exports = { check, MIN_MAJOR };

if (require.main === module) {
  try {
    check();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
X
cm 1 "chore: refuse to start on old Node"
echo "18.17.0" > .nvmrc
printf 'nodejs 18.17.0\n' > .tool-versions
cm 1 "chore: pin Node for nvm and asdf"
cat > Dockerfile <<'X'
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY scripts ./scripts

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "src/server.js"]
X
cm 3 "build: multi-stage Dockerfile"
cat > Dockerfile.worker <<'X'
FROM node:20-slim
WORKDIR /app
COPY package.json ./
COPY src ./src
ENV CHECK_INTERVAL_MS=30000
CMD ["node", "src/server.js"]
X
cm 3 "build: worker image with shorter interval"
cat > docker-compose.yml <<'X'
services:
  web:
    image: node:18
    working_dir: /app
    volumes: [".:/app"]
    command: node src/server.js
    ports:
      - "8018:8080"
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: changeme-local
X
cm 3 "chore: compose file for local dev"
cat > .github/workflows/ci.yml <<'X'
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16, 18]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
X
cm 3 "ci: test on supported Node versions"
cat > .github/workflows/deploy.yml <<'X'
name: deploy
on:
  push:
    tags: ["v*"]
jobs:
  image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18.x
      - run: node scripts/check-node.js
      - run: docker build -t linkwatch:${{ github.ref_name }} .
X
cm 3 "ci: build image on tag"
cat > test/config.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const loadConfig = require('../src/config');

test('defaults', () => {
  const c = loadConfig({});
  assert.strictEqual(c.port, 8080);
  assert.strictEqual(c.intervalMs, 60000);
  assert.strictEqual(c.requestTimeoutMs, 5000);
});

test('env overrides', () => {
  const c = loadConfig({ PORT: '9000', CHECK_INTERVAL_MS: '1000' });
  assert.strictEqual(c.port, 9000);
  assert.strictEqual(c.intervalMs, 1000);
});
X
cm 2 "test: config"
cat > test/checker.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { check } = require('../src/checker');

test('ok on 200', async () => {
  const r = await check('http://a.test', 100, async () => ({ status: 200 }));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.status, 200);
});

test('not ok on 503', async () => {
  const r = await check('http://a.test', 100, async () => ({ status: 503 }));
  assert.strictEqual(r.ok, false);
});

test('network error is captured', async () => {
  const r = await check('http://a.test', 100, async () => {
    throw new Error('boom');
  });
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /boom/);
});
X
cm 2 "test: checker"
cat > test/store.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const store = require('../src/store');

test('append and load', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-'));
  const file = path.join(dir, 'r.json');
  store.append(file, { a: 1 });
  store.append(file, { a: 2 });
  assert.deepStrictEqual(store.load(file), [{ a: 1 }, { a: 2 }]);
});

test('keeps only the newest records', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lw-'));
  const file = path.join(dir, 'r.json');
  for (let i = 0; i < 5; i++) store.append(file, { i }, 3);
  assert.deepStrictEqual(store.load(file).map((r) => r.i), [2, 3, 4]);
});
X
cm 1 "test: store"
cat > test/check-node.test.js <<'X'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { check, MIN_MAJOR } = require('../scripts/check-node');

test('rejects Node 16', () => {
  assert.throws(() => check('16.20.2'), /requires Node 18 or newer/);
});

test('accepts the minimum', () => {
  assert.strictEqual(check('18.0.0'), 18);
});

test('accepts newer', () => {
  assert.strictEqual(check('20.11.1'), 20);
  assert.ok(MIN_MAJOR <= 20);
});
X
cm 1 "test: node version guard"
cat > test/consistency.test.js <<'X'
'use strict';
// Keeps the version pins from drifting apart.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { MIN_MAJOR } = require('../scripts/check-node');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('.nvmrc matches the minimum major', () => {
  assert.strictEqual(Number(read('.nvmrc').trim().split('.')[0]), MIN_MAJOR);
});

test('Dockerfile runtime image matches the minimum major', () => {
  const froms = read('Dockerfile').match(/^FROM node:(\d+)/gm);
  for (const f of froms) assert.ok(f.includes(`node:${MIN_MAJOR}`), f);
});

test('.tool-versions matches the minimum major', () => {
  assert.match(read('.tool-versions'), new RegExp(`nodejs ${MIN_MAJOR}\\.`));
});
X
cm 3 "test: guard against version pin drift"
cat > README.md <<'X'
# linkwatch

Watches a list of URLs and records when they go down.

## Requirements

Node 18 or newer. Use `nvm use` (see `.nvmrc`).

## Run

    TARGETS=https://example.com,https://example.org npm start

## Test

    npm test
X
cm 1 "docs: README"
cat > docs/development.md <<'X'
# Development

Install the pinned runtime:

    nvm install 18
    nvm use

`npm start` refuses to run on anything older than Node 18 (`scripts/check-node.js`).

The compose file mounts the source into a `node:18` container:

    docker compose up web
X
cm 1 "docs: development guide"
cat > docs/deploy.md <<'X'
# Deploy

Images are built from `Dockerfile` (`node:18-alpine`). The worker variant,
`Dockerfile.worker`, polls every 30 seconds and is deployed separately.

Tag a release (`v2.3.0`) and the deploy workflow builds `linkwatch:<tag>`.
X
cm 3 "docs: deploy notes"
cat > CHANGELOG.md <<'X'
# Changelog

## 2.3.0
- Add worker image.
- Add consistency test for version pins.

## 2.2.0
- Drop Node 16 support in the start script; it now requires Node 18.

## 2.1.0
- Keep only the newest 500 results.
X
cm 1 "docs: changelog"
printf '\nSee docs/ for development and deploy notes.\n' >> README.md
cm 2 "docs: link to docs folder"
printf '\n## Health\n\n`GET /healthz` returns `ok`.\n' >> README.md
cm 2 "docs: health endpoint"
printf '{"name":"example"}\n' > scripts/sample-targets.json
cm 2 "chore: sample targets"
printf '\n- Fix: store ignores unreadable files.\n' >> CHANGELOG.md
cm 3 "docs: changelog fix note"
printf '\nThe worker polls every 30 seconds by default.\n' >> docs/deploy.md
cm 3 "docs: worker interval"
printf '\n## Ports\n\nLocal compose exposes the app on 8018.\n' >> docs/development.md
cm 1 "docs: compose port"
printf '.env.example\n' >> .gitignore
printf 'PORT=8080\nTARGETS=https://example.com\n' > .env.example
cm 2 "chore: env example"
printf '\n## Config\n\nSee `.env.example` for the available variables.\n' >> README.md
cm 1 "docs: config pointer"
printf '\n- Chore: add .env.example.\n' >> CHANGELOG.md
cm 2 "docs: changelog env example"
