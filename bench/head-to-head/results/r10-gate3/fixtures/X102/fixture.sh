#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Team"
git config user.email "dev@example.test"
D=0
now() { echo "@$((1767225600 + D*37000)) +0000"; }
c() { D=$((D+1)); local t; t=$(now); git add -A; GIT_AUTHOR_DATE="$t" GIT_COMMITTER_DATE="$t" git commit -q -m "$1"; }

mkdir -p src test docs .github/workflows
cat > package.json <<'EOF'
{
  "name": "pingmon",
  "version": "2.2.0",
  "scripts": { "test": "node --test" }
}
EOF
cat > README.md <<'EOF'
# pingmon

Uptime monitoring client. Create checks, get alerts.
EOF
c "chore: initial project"

for k in http tcp dns ssl ping; do
  cat > src/check_$k.js <<EOF
exports.kind = '$k';
exports.run = (target) => ({ kind: '$k', target, ok: Boolean(target) });
EOF
  cat > test/check_$k.test.js <<EOF
const test = require('node:test');
const assert = require('node:assert');
const m = require('../src/check_$k');
test('$k check runs', () => assert.strictEqual(m.run('x').ok, true));
EOF
  c "feat: $k check"
done

cat > src/config.js <<'EOF'
const DEFAULTS = { retryLimit: 3, timeoutMs: 5000 };
exports.resolve = (o = {}) => ({ ...DEFAULTS, ...o });
EOF
cat > test/config.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { resolve } = require('../src/config');
test('defaults', () => {
  assert.strictEqual(resolve().retryLimit, 3);
  assert.strictEqual(resolve().timeoutMs, 5000);
});
test('override', () => assert.strictEqual(resolve({ retryLimit: 5 }).retryLimit, 5));
EOF
c "feat: configuration with defaults"

cat > src/limits.js <<'EOF'
module.exports = { FREE_PLAN_CHECKS: 50, TRIAL_DAYS: 14, PRO_PRICE_CENTS: 1900 };
EOF
cat > test/limits.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const l = require('../src/limits');
test('plan numbers', () => {
  assert.strictEqual(l.FREE_PLAN_CHECKS, 50);
  assert.strictEqual(l.TRIAL_DAYS, 14);
  assert.strictEqual(l.PRO_PRICE_CENTS, 1900);
});
EOF
c "feat: plan limits"

cat > src/alerts.js <<'EOF'
exports.send = (msg, cfg = {}) => ({ delivered: true, channel: 'email', msg });
EOF
cat > src/index.js <<'EOF'
module.exports = { ...require('./config'), alerts: require('./alerts') };
EOF
cat > test/alerts.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const a = require('../src/alerts');
test('alert is delivered by email', () => assert.strictEqual(a.send('down').channel, 'email'));
EOF
c "feat: email alerts"

cat > .github/workflows/ci.yml <<'EOF'
name: ci
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node --test
EOF
cat > docs/config.md <<'EOF'
# Configuration

- `retryLimit` (default 3): how many times a failed check is retried.
- `timeoutMs` (default 5000): per-check timeout.
EOF
c "docs: configuration reference"
cat > CHANGELOG.md <<'EOF'
# Changelog

## 2.2.0
- Five check types: http, tcp, dns, ssl, ping.
- Email alerts.
- Free plan: 50 checks, 14-day Pro trial, Pro at $19.
EOF
c "chore: release 2.2.0"
git tag v2.2.0

# ---------- after 2.2.0
cat > src/digest.js <<'EOF'
exports.build = (events) => ({ subject: 'Daily digest', count: events.length });
EOF
cat > test/digest.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const d = require('../src/digest');
test('digest counts events', () => assert.strictEqual(d.build([1, 2]).count, 2));
EOF
sed -i.bak 's/timeoutMs: 5000 };/timeoutMs: 5000, digest: false };/' src/config.js && rm src/config.js.bak
c "feat: daily email digest"

sed -i.bak 's/node --test/node --test --test-reporter=spec/' .github/workflows/ci.yml && rm .github/workflows/ci.yml.bak
c "ci: readable reporter"

for k in http tcp dns; do
  echo "test('$k target is echoed', () => assert.strictEqual(m.run('a.example').target, 'a.example'));" >> test/check_$k.test.js
  c "test: $k target echo"
done

cat > src/config.js <<'EOF'
const DEFAULTS = { maxRetries: 3, timeoutMs: 5000, digest: false };
exports.resolve = (o = {}) => {
  if ('retryLimit' in o) throw new Error('retryLimit was renamed to maxRetries');
  return { ...DEFAULTS, ...o };
};
EOF
cat > test/config.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { resolve } = require('../src/config');
test('defaults', () => {
  assert.strictEqual(resolve().maxRetries, 3);
  assert.strictEqual(resolve().timeoutMs, 5000);
  assert.strictEqual(resolve().digest, false);
});
test('override', () => assert.strictEqual(resolve({ maxRetries: 5 }).maxRetries, 5));
test('old name is rejected', () => assert.throws(() => resolve({ retryLimit: 5 })));
EOF
c "chore: tidy config"

cat > src/slack.js <<'EOF'
exports.post = (msg) => ({ delivered: true, channel: 'slack', msg });
EOF
echo "module.exports.slack = require('./slack');" >> src/index.js
c "feat: slack alerts"
SLACK=$(git rev-parse HEAD)

cat > docs/slack.md <<'EOF'
# Slack alerts

Connect a Slack workspace and alerts are posted to the channel of your choice.
EOF
echo "Slack alerts are supported, see docs/slack.md." >> README.md
c "docs: slack setup"

t=$(now); D=$((D+1)); t=$(now)
GIT_AUTHOR_DATE="$t" GIT_COMMITTER_DATE="$t" git revert --no-edit "$SLACK" >/dev/null

git mv src/limits.js src/plans.js
git mv test/limits.test.js test/plans.test.js
cat > src/plans.js <<'EOF'
module.exports = { FREE_PLAN_CHECKS: 25, TRIAL_DAYS: 7, PRO_PRICE_CENTS: 2200 };
EOF
cat > test/plans.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const l = require('../src/plans');
test('plan numbers', () => {
  assert.strictEqual(l.FREE_PLAN_CHECKS, 25);
  assert.strictEqual(l.TRIAL_DAYS, 7);
  assert.strictEqual(l.PRO_PRICE_CENTS, 2200);
});
EOF
c "refactor: move constants to plans.js"

sed -i.bak 's/timeoutMs: 5000/timeoutMs: 10000/' src/config.js && rm src/config.js.bak
sed -i.bak 's/timeoutMs, 5000/timeoutMs, 10000/' test/config.test.js && rm test/config.test.js.bak
c "fix: timeout handling"

cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased
- Slack alerts.
- Daily email digest.
- Free plan: 50 checks, 14-day Pro trial.
- Configure retries with `retryLimit`.

## 2.2.0
- Five check types: http, tcp, dns, ssl, ping.
- Email alerts.
- Free plan: 50 checks, 14-day Pro trial, Pro at $19.
EOF
c "docs: draft changelog"
sed -i.bak 's/"version": "2.2.0"/"version": "2.3.0"/' package.json && rm package.json.bak
c "chore: format"
