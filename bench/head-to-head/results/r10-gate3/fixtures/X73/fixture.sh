#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.test"
n=0
c() {
  n=$((n+1))
  local d
  d=$(printf '2026-%02d-%02dT09:%02d:00+0000' $((1+n/25)) $((1+n%25)) "$n")
  git add -A
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}
util() {
  mkdir -p src/util test
  cat > "src/util/$1.js" <<EOF
'use strict';
exports.$2 = $3;
EOF
  cat > "test/util-$1.test.js" <<EOF
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { $2 } = require('../src/util/$1');
test('$1 $2', () => {
  assert.strictEqual($4, $5);
});
EOF
  c "feat(util): add $1.$2"
}

mkdir -p src/util test scripts docs packages/util .github/workflows
cat > package.json <<'EOF'
{
  "name": "beacon",
  "version": "2.3.0",
  "description": "Uptime beacon service",
  "main": "src/server.js",
  "engines": { "node": ">=18" },
  "scripts": {
    "test": "node --test",
    "check:node": "node scripts/check-node.js"
  },
  "devDependencies": { "@types/node": "^18.19.0" },
  "workspaces": ["packages/*"],
  "license": "MIT"
}
EOF
echo 18 > .nvmrc
cat > README.md <<'EOF'
# beacon

Uptime beacon service.

## Requirements

Node 18 or newer. `.nvmrc` pins the version used for development.

    nvm use
    npm test

See `docs/contributing.md` and `docs/deploy.md`.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased

## 2.3.0
- Add `/ready` endpoint.

## 2.0.0
- Workspaces: shared helpers moved to `packages/util`.
EOF
c "chore: project skeleton"

cat > src/server.js <<'EOF'
'use strict';
const http = require('http');
const { status } = require('./status');

function createServer() {
  return http.createServer((req, res) => {
    const s = status(req.url);
    res.writeHead(s.code, { 'content-type': 'application/json' });
    res.end(JSON.stringify(s.body));
  });
}

module.exports = { createServer };
EOF
cat > src/status.js <<'EOF'
'use strict';
function status(url) {
  if (url === '/health') return { code: 200, body: { ok: true } };
  if (url === '/ready') return { code: 200, body: { ready: true } };
  return { code: 404, body: { error: 'not found' } };
}
module.exports = { status };
EOF
cat > test/status.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { status } = require('../src/status');

test('health', () => assert.strictEqual(status('/health').code, 200));
test('ready', () => assert.strictEqual(status('/ready').body.ready, true));
test('unknown', () => assert.strictEqual(status('/x').code, 404));
EOF
c "feat: health and ready endpoints"

cat > scripts/check-node.js <<'EOF'
'use strict';
const MIN_MAJOR = 18;

function parse(v) {
  return Number(String(v).replace(/^v/, '').split('.')[0]);
}

function isSupported(v) {
  return parse(v) >= MIN_MAJOR;
}

if (require.main === module && !isSupported(process.version)) {
  console.error('beacon requires Node ' + MIN_MAJOR + ' or newer');
  process.exit(1);
}

module.exports = { MIN_MAJOR, isSupported, parse };
EOF
cat > test/check-node.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { isSupported } = require('../scripts/check-node');

test('old majors are rejected', () => {
  assert.strictEqual(isSupported('v16.20.2'), false);
});
test('minimum major is accepted', () => {
  assert.strictEqual(isSupported('v18.0.0'), true);
});
test('newer majors are accepted', () => {
  assert.strictEqual(isSupported('v22.1.0'), true);
});
EOF
c "chore: runtime version check"

cat > packages/util/package.json <<'EOF'
{
  "name": "@beacon/util",
  "version": "1.0.1",
  "main": "index.js",
  "engines": { "node": ">=18" }
}
EOF
cat > packages/util/index.js <<'EOF'
'use strict';
exports.clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
EOF
c "refactor: shared helpers package"

cat > Dockerfile <<'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
COPY packages ./packages
COPY src ./src
RUN npm install --omit=dev
CMD ["node", "src/server.js"]
EOF
cat > Dockerfile.dev <<'EOF'
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "test"]
EOF
c "build: production and dev images"

cat > .github/workflows/ci.yml <<'EOF'
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm install
      - run: npm test
EOF
cat > .github/workflows/release.yml <<'EOF'
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
      - run: npm install
      - run: npm test
      - run: npm publish --workspace packages/util
EOF
cat > .github/dependabot.yml <<'EOF'
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    ignore:
      - dependency-name: "@types/node"
        versions: [">=19"]
EOF
c "ci: test matrix, release workflow, dependabot"

cat > docs/contributing.md <<'EOF'
# Contributing

Use Node 18 (run `nvm use`). Run `npm test` before opening a pull request.
`npm run check:node` tells you whether your runtime is supported.
EOF
cat > docs/deploy.md <<'EOF'
# Deploying

The production image is built from `Dockerfile` and is based on
`node:18-alpine`. Build and run:

    docker build -t beacon .
    docker run -p 8080:8080 beacon

`Dockerfile.dev` is only used to run the test suite in a container.
EOF
c "docs: contributing and deploy"

for spec in \
 "pad|left|(s, n) => String(s).padStart(n, '0')|left(7, 3)|007" \
 "bytes|kb|(n) => Math.round(n / 1024)|kb(2048)|2" \
 "names|initials|(s) => s.split(' ').map((w) => w[0]).join('')|initials('Ada Lovelace')|AL" \
 "keys|join|(...p) => p.join(':')|join('a', 'b')|a:b" \
 "stats|ratio|(a, b) => (b === 0 ? 0 : a / b)|ratio(1, 4)|0.25" ; do
  IFS='|' read -r f fn ex call exp <<<"$spec"
  case "$exp" in 2) e=2;; 0.25) e=0.25;; *) e="'$exp'";; esac
  util "$f" "$fn" "$ex" "$call" "$e"
done
echo node_modules > .gitignore
c "chore: gitignore"
