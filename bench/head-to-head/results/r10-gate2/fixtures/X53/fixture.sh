#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.com"

N=0
commit() {
  N=$((N + 1))
  local d
  d=$(printf '2025-06-%02dT%02d:00:00Z' $((1 + N / 6)) $((8 + N % 6 * 2)))
  git add -A
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}

mkdir -p src/routes src/util test docs scripts nginx .github/workflows

cat > package.json <<'EOF'
{
  "name": "pingboard",
  "version": "0.4.0",
  "private": true,
  "scripts": { "start": "node src/server.js", "test": "node --test" }
}
EOF

cat > src/config.js <<'EOF'
const DEFAULT_PORT = 3000;
const SHUTDOWN_GRACE_MS = 3000;

function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT) || DEFAULT_PORT,
    graceMs: SHUTDOWN_GRACE_MS,
  };
}

module.exports = { loadConfig, DEFAULT_PORT, SHUTDOWN_GRACE_MS };
EOF
cat > src/routes/health.js <<'EOF'
function health(req, res) {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
}
module.exports = { health };
EOF
cat > src/routes/index.js <<'EOF'
const { health } = require('./health');
const { listPlans } = require('../plans');

function route(req, res) {
  if (req.url === '/health') return health(req, res);
  if (req.url === '/plans') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(listPlans()));
  }
  res.writeHead(404);
  res.end();
}
module.exports = { route };
EOF
cat > src/plans.js <<'EOF'
const PLANS = [
  { id: 'free', priceCents: 0 },
  { id: 'team', priceCents: 3000 },
  { id: 'business', priceCents: 12000 },
];
function listPlans() {
  return PLANS.map((p) => ({ ...p }));
}
module.exports = { listPlans };
EOF
cat > src/server.js <<'EOF'
const http = require('node:http');
const { loadConfig } = require('./config');
const { route } = require('./routes');

function start(port = loadConfig().port) {
  const server = http.createServer(route);
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (require.main === module) {
  start().then((s) => console.log('pingboard listening on ' + s.address().port));
}

module.exports = { start };
EOF
cat > test/config.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { loadConfig } = require('../src/config');

test('default port', () => {
  assert.strictEqual(loadConfig({}).port, 3000);
});

test('PORT env overrides', () => {
  assert.strictEqual(loadConfig({ PORT: '4100' }).port, 4100);
});

test('grace period', () => {
  assert.strictEqual(loadConfig({}).graceMs, 3000);
});
EOF
cat > test/server.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { start } = require('../src/server');

test('GET /health', async () => {
  const server = await start(0);
  const { port } = server.address();
  const res = await fetch('http://127.0.0.1:' + port + '/health');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { ok: true });
  server.close();
});
EOF
cat > test/plans.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { listPlans } = require('../src/plans');

test('team plan costs 30.00', () => {
  assert.strictEqual(listPlans().find((p) => p.id === 'team').priceCents, 3000);
});
EOF
commit "feat: health endpoint, plans and config"

cat > scripts/healthcheck.js <<'EOF'
#!/usr/bin/env node
function healthUrl(env = process.env) {
  return 'http://localhost:' + (env.PORT || 3000) + '/health';
}

if (require.main === module) {
  fetch(healthUrl()).then(
    (r) => process.exit(r.ok ? 0 : 1),
    () => process.exit(1),
  );
}

module.exports = { healthUrl };
EOF
cat > test/healthcheck.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { healthUrl } = require('../scripts/healthcheck');

test('health url uses default port', () => {
  assert.strictEqual(healthUrl({}), 'http://localhost:3000/health');
});

test('health url follows PORT', () => {
  assert.strictEqual(healthUrl({ PORT: '9000' }), 'http://localhost:9000/health');
});
EOF
commit "feat: healthcheck script"

cat > Dockerfile <<'EOF'
FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s CMD node scripts/healthcheck.js
CMD ["node", "src/server.js"]
EOF
cat > docker-compose.yml <<'EOF'
services:
  pingboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      PORT: "3000"
EOF
cat > .env.example <<'EOF'
# Copy to .env for local development
PORT=3000
EOF
commit "build: Dockerfile, compose file and env example"

cat > nginx/pingboard.conf <<'EOF'
server {
  listen 80;
  server_name pingboard.example.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
  }
}
EOF
cat > .github/workflows/ci.yml <<'EOF'
name: ci
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: node --test
      - name: smoke test
        run: |
          node src/server.js &
          sleep 1
          curl -fs http://localhost:3000/health
EOF
commit "ci: test and smoke check; nginx reverse proxy sample"

cat > README.md <<'EOF'
# pingboard

Uptime board with a small HTTP API.

    npm start
    curl http://localhost:3000/health

Set `PORT` to listen somewhere else. With Docker:

    docker compose up
    curl http://localhost:3000/plans
EOF
cat > docs/deploy.md <<'EOF'
# Deploying

## Production

The image is built from the Dockerfile and sits behind the nginx config in
nginx/pingboard.conf.

## Staging

Staging is deployed from the separate `pingboard-infra` repository. The
container port is the `app_port` variable in `envs/staging.tfvars` there
(currently 3000). This repository holds no staging configuration.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.4.0
- Healthcheck script and Docker HEALTHCHECK.

## 0.2.0
- The server listens on port 3000 by default.

## 0.1.0
- First version: /health and /plans.
EOF
commit "docs: README, deploy notes, changelog"

while IFS='|' read -r name body pair; do
  cat > "src/util/$name.js" <<EOF
$body
module.exports = { $name };
EOF
  cat > "test/util-$name.test.js" <<EOF
const test = require('node:test');
const assert = require('node:assert');
const { $name } = require('../src/util/$name');

test('$name', () => {
  assert.strictEqual($pair);
});
EOF
  commit "feat(util): add $name"
done <<'EOF'
ms|function ms(s) { return s * 1000; }|ms(2), 2000
percent|function percent(a, b) { return b === 0 ? 0 : Math.round(a / b * 100); }|percent(1, 4), 25
plural|function plural(n, w) { return n === 1 ? w : w + 's'; }|plural(2, 'check'), 'checks'
trim|function trim(s) { return String(s).trim(); }|trim(' a '), 'a'
EOF

printf 'node_modules/\n.env\n' > .gitignore
commit "chore: add .gitignore"
