#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Tom Okafor"
git config user.email "tom@example.test"
N=0
c() {
  N=$((N+1)); local t=$((1742000000 + N*44000)) an ae
  case $1 in d) an="Dana Ruiz"; ae="dana@example.test";; t) an="Tom Okafor"; ae="tom@example.test";; l) an="Lena Vogt"; ae="lena@example.test";; esac
  git add -A
  GIT_AUTHOR_NAME="$an" GIT_AUTHOR_EMAIL="$ae" GIT_COMMITTER_NAME="$an" GIT_COMMITTER_EMAIL="$ae" \
  GIT_AUTHOR_DATE="$t +0000" GIT_COMMITTER_DATE="$t +0000" git commit -q -m "$2"
}
tagv() { git tag -a "$1" -m "$1"; }
mkdir -p src/routes test docs

ver() { # set the version everywhere
  sed -i.bak "s/\"version\": \"[0-9.]*\"/\"version\": \"$1\"/g" package.json package-lock.json
  printf "'use strict';\nmodule.exports = '%s';\n" "$1" > src/version.js
  sed -i.bak "s/^LABEL version=\"[0-9.]*\"/LABEL version=\"$1\"/" Dockerfile
  sed -i.bak "s/^Service version: .*/Service version: $1/" docs/api.md
  rm -f package.json.bak package-lock.json.bak Dockerfile.bak docs/api.md.bak
}

cat > package.json <<'EOF'
{
  "name": "pingboard",
  "version": "1.0.0",
  "description": "Tiny status-page service",
  "main": "src/server.js",
  "scripts": { "start": "node src/server.js", "test": "node --test" },
  "engines": { "node": ">=18" }
}
EOF
cat > package-lock.json <<'EOF'
{
  "name": "pingboard",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "pingboard",
      "version": "1.0.0",
      "engines": { "node": ">=18" }
    }
  }
}
EOF
printf "'use strict';\nmodule.exports = '1.0.0';\n" > src/version.js
cat > Dockerfile <<'EOF'
FROM node:20-alpine
LABEL version="1.0.0"
WORKDIR /app
COPY package.json ./
COPY src ./src
CMD ["node", "src/server.js"]
EOF
cat > docs/api.md <<'EOF'
# pingboard API

Service version: 1.0.0

## GET /v1/status
Returns `{ "ok": true, "version": "<service version>" }`.
EOF
printf 'node_modules/\n' > .gitignore
cat > README.md <<'EOF'
# pingboard

A tiny service that exposes a status endpoint for the internal status page.

    npm start
    npm test

Releases: update CHANGELOG.md, bump the version, tag `vX.Y.Z`.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased

## 1.0.0 - 2025-01-10
- First release
EOF
c d "first cut of pingboard"; tagv v1.0.0

cat > src/net.js <<'EOF'
'use strict';

function clientIp(req) {
  return req.headers['x-forwarded-for'].split(',')[0].trim();
}

module.exports = { clientIp };
EOF
cat > src/routes/status.js <<'EOF'
'use strict';
const version = require('../version');

module.exports = function status() {
  return { ok: true, version };
};
EOF
cat > src/server.js <<'EOF'
'use strict';
const http = require('node:http');
const status = require('./routes/status');
const { clientIp } = require('./net');

const routes = { '/v1/status': status };

function handler(req, res) {
  const route = routes[req.url];
  if (!route) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader('x-client', clientIp(req));
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(route()));
}

if (require.main === module) {
  http.createServer(handler).listen(process.env.PORT || 8080);
}

module.exports = { handler, routes };
EOF
c d "server and status route"

cat > test/net.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { clientIp } = require('../src/net');

test('uses the first forwarded address', () => {
  const req = { headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' } };
  assert.strictEqual(clientIp(req), '10.0.0.1');
});
EOF
cat > test/status.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const status = require('../src/routes/status');

test('status is ok', () => {
  assert.strictEqual(status().ok, true);
});
EOF
cat > test/version.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const pkg = require('../package.json');
const lock = require('../package-lock.json');
const version = require('../src/version');

test('version.js matches package.json and the lockfile', () => {
  assert.strictEqual(version, pkg.version);
  assert.strictEqual(lock.version, pkg.version);
  assert.strictEqual(lock.packages[''].version, pkg.version);
});
EOF
c t "tests"

printf '\n## Notes\nThe service sits behind our proxy, which always sets X-Forwarded-For.\n' >> docs/api.md
c l "api doc: proxy note"
printf '\n## 1.1.0 placeholder\n' > /dev/null
sed -i.bak 's/^## Unreleased$/## Unreleased\n- Added `GET \/v1\/health`/' CHANGELOG.md && rm -f CHANGELOG.md.bak
cat > src/routes/health.js <<'EOF'
'use strict';

module.exports = function health() {
  return { healthy: true };
};
EOF
sed -i.bak "s#const routes = { '/v1/status': status };#const health = require('./routes/health');\n\nconst routes = { '/v1/status': status, '/v1/health': health };#" src/server.js && rm -f src/server.js.bak
c d "add /v1/health"
python3 - <<'EOF'
s=open('CHANGELOG.md').read()
s=s.replace("## Unreleased\n- Added `GET /v1/health`\n","## Unreleased\n\n## 1.1.0 - 2025-02-03\n- Added `GET /v1/health`\n")
open('CHANGELOG.md','w').write(s)
EOF
ver 1.1.0
c d "release 1.1.0"; tagv v1.1.0

printf '\n- Deploy notes moved to the wiki\n' >> README.md
c l "readme: wiki pointer"
python3 - <<'EOF'
s=open('CHANGELOG.md').read()
s=s.replace("## Unreleased\n","## Unreleased\n\n## 1.2.0 - 2025-02-20\n- Status response is now served with a JSON content type header\n",1)
open('CHANGELOG.md','w').write(s)
EOF
ver 1.2.0
c t "1.2.0"; tagv v1.2.0

printf '\n## Health\n`GET /v1/health` returns `{ "healthy": true }`.\n' >> docs/api.md
c d "docs: health endpoint"
python3 - <<'EOF'
s=open('CHANGELOG.md').read()
s=s.replace("## Unreleased\n","## Unreleased\n\n## 1.3.0 - 2025-03-05\n- Docs for the health endpoint\n",1)
open('CHANGELOG.md','w').write(s)
EOF
ver 1.3.0
c d "release 1.3.0"; tagv v1.3.0

printf '\nThe `/v1/status` endpoint has existed since 1.0.0; `/v1/health` since 1.1.0.\n' >> docs/api.md
c l "docs: since-versions"
python3 - <<'EOF'
s=open('CHANGELOG.md').read()
s=s.replace("## Unreleased\n","## Unreleased\n\n## 1.4.0 - 2025-03-28\n- Dockerfile now labels the image with the service version\n",1)
open('CHANGELOG.md','w').write(s)
EOF
ver 1.4.0
c t "release 1.4.0"; tagv v1.4.0

cat > docs/deploy.md <<'EOF2'
# Deploying

Build the image with `docker build -t pingboard .`. Since 1.4.0 the image
carries a `version` label, so `docker inspect` shows which release is running.
EOF2
c l "deploy notes"
printf '\n// routes are looked up by exact URL\n' >> src/server.js
c t "server comment"
printf '\nOpen an issue for new endpoints.\n' >> README.md
c d "readme: contributing line"
# ---- hotfix on a release branch, never merged back ----
git checkout -q -b release/1.4
cat > src/net.js <<'EOF'
'use strict';

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (!fwd) return (req.socket && req.socket.remoteAddress) || 'unknown';
  return fwd.split(',')[0].trim();
}

module.exports = { clientIp };
EOF
cat >> test/net.test.js <<'EOF'

test('falls back to the socket address when the header is missing', () => {
  const req = { headers: {}, socket: { remoteAddress: '192.168.1.5' } };
  assert.strictEqual(clientIp(req), '192.168.1.5');
});
EOF
c l "fix crash when x-forwarded-for is missing (health checks hit the app directly)"
python3 - <<'EOF'
s=open('CHANGELOG.md').read()
s=s.replace("## Unreleased\n","## Unreleased\n\n## 1.4.1 - 2025-04-02\n- Fixed: the service crashed with a TypeError for requests that carry no X-Forwarded-For header\n",1)
open('CHANGELOG.md','w').write(s)
EOF
ver 1.4.1
c l "1.4.1"; tagv v1.4.1
git checkout -q main

# ---- main moves on ----
cat > src/routes/metrics.js <<'EOF'
'use strict';
const started = Date.now();

module.exports = function metrics() {
  return { uptime_s: Math.floor((Date.now() - started) / 1000) };
};
EOF
sed -i.bak "s#const routes = {#const metrics = require('./routes/metrics');\n\nconst routes = {#; s#'/v1/health': health }#'/v1/health': health, '/v1/metrics': metrics }#" src/server.js && rm -f src/server.js.bak
cat >> test/status.test.js <<'EOF'

test('metrics reports uptime', () => {
  const metrics = require('../src/routes/metrics');
  assert.ok(metrics().uptime_s >= 0);
});
EOF
python3 - <<'EOF'
s=open('CHANGELOG.md').read()
s=s.replace("## Unreleased\n","## Unreleased\n- Added `GET /v1/metrics` with the service uptime in seconds\n",1)
open('CHANGELOG.md','w').write(s)
EOF
c d "add /v1/metrics"
printf '\n## Metrics\n`GET /v1/metrics` returns `{ "uptime_s": <seconds> }`.\n' >> docs/api.md
c d "docs: metrics"
python3 - <<'EOF'
s=open('src/routes/status.js').read()
s=s.replace("return { ok: true, version };","return { ok: true, version, node: process.version };")
open('src/routes/status.js','w').write(s)
s=open('CHANGELOG.md').read()
s=s.replace("## Unreleased\n","## Unreleased\n- `GET /v1/status` now also reports the Node.js version it runs on\n",1)
open('CHANGELOG.md','w').write(s)
EOF
c t "status: report node version"
printf '\nSee CHANGELOG.md for what changed.\n' >> README.md
c l "readme"
printf '\n// note: metrics are per process\n' >> src/routes/metrics.js
c t "metrics comment"
printf '\nMetrics are reset on restart.\n' >> docs/api.md
c d "docs: metrics reset note"
