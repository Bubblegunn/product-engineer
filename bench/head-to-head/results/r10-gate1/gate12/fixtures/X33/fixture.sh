#!/usr/bin/env bash
set -e
cd "$1"
git init -q -b main
git config user.name "Upload Dev"; git config user.email "dev@upload.example"
c(){ git add -A; GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$1"; }
mkdir -p src test deploy docs
cat > package.json <<'EOF'
{"name":"uploader","version":"2.1.0","scripts":{"test":"node --test"}}
EOF
cat > config.json <<'EOF'
{
  "uploadTimeoutSeconds": 5,
  "maxFileMb": 200
}
EOF
cat > src/limits.js <<'EOF'
// Set by the load balancer in front of the app, see docs/gateway.md.
// Requests are cut at 10 s no matter what the app does. Raising this value changes nothing upstream.
exports.GATEWAY_LIMIT_MS = 10000;
EOF
cat > src/upload.js <<'EOF'
const cfg = require('../config.json');
const { GATEWAY_LIMIT_MS } = require('./limits');
function configuredSeconds(env = process.env) {
  const raw = env.UPLOAD_TIMEOUT_SECONDS;
  return raw !== undefined && raw !== '' ? Number(raw) : cfg.uploadTimeoutSeconds;
}
function effectiveTimeoutMs(env = process.env) {
  return Math.min(configuredSeconds(env) * 1000, GATEWAY_LIMIT_MS);
}
module.exports = { configuredSeconds, effectiveTimeoutMs };
EOF
cat > test/upload.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const cfg = require('../config.json');
const { effectiveTimeoutMs, configuredSeconds } = require('../src/upload');
test('uses config.json when env is empty', () => {
  assert.strictEqual(configuredSeconds({}), cfg.uploadTimeoutSeconds);
});
test('env overrides config', () => {
  assert.strictEqual(configuredSeconds({ UPLOAD_TIMEOUT_SECONDS: '8' }), 8);
});
test('never above the gateway limit', () => {
  assert.strictEqual(effectiveTimeoutMs({ UPLOAD_TIMEOUT_SECONDS: '60' }), 10000);
});
EOF
cat > docs/gateway.md <<'EOF'
# Gateway
The load balancer closes any request that is open longer than 10 seconds. This is a platform setting owned by the infrastructure team, not by this repository.
EOF
cat > README.md <<'EOF'
# uploader
Upload timeout comes from config.json (uploadTimeoutSeconds). The deploy environment can override it.
EOF
c "feat: configurable upload timeout" "2026-04-02T09:00:00Z"
cat > deploy/app.env <<'EOF'
NODE_ENV=production
UPLOAD_TIMEOUT_SECONDS=5
EOF
c "chore: production env file" "2026-04-10T09:00:00Z"
