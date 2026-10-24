#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Maya Ortiz"
git config user.email "maya@example.test"
NAMES=("Maya Ortiz" "Dana Weiss" "Sam Okafor")
MAILS=(maya@example.test dana@example.test sam@example.test)
N=0
ident() {
  export GIT_AUTHOR_NAME="${NAMES[$1]}" GIT_AUTHOR_EMAIL="${MAILS[$1]}" GIT_COMMITTER_NAME="${NAMES[$1]}" GIT_COMMITTER_EMAIL="${MAILS[$1]}"
}
tick() {
  N=$((N + 1))
  D=$(printf '2026-03-%02dT%02d:15:00+0000' $((1 + N / 24)) $((N % 24)))
  export GIT_AUTHOR_DATE=$D GIT_COMMITTER_DATE=$D
}
c() { ident "$1"; tick; git add -A; git commit -q -m "$2"; }

mkdir -p src test
cat > package.json <<'EOF'
{ "name": "ledger-core", "version": "1.4.0", "private": true, "scripts": { "test": "node --test" } }
EOF
printf '# ledger-core\n\nSmall internal library: config, http options, helper modules.\n\n## Config\n\nDefaults live in `src/config.js`.\n' > README.md
printf '# Changelog\n\n## 1.4.0\n- Initial public layout\n' > CHANGELOG.md
cat > src/index.js <<'EOF'
module.exports = { config: require('./config'), http: require('./http') };
EOF
c 0 "chore: scaffold project"

cat > src/config.js <<'EOF'
module.exports = {
  timeoutMs: 30000,
  retries: 3,
  cacheTtl: 60,
};
EOF
cat > test/config.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const cfg = require('../src/config');
test('default timeout is 30 seconds', () => { assert.equal(cfg.timeoutMs, 30000); });
test('default retries is 3', () => { assert.equal(cfg.retries, 3); });
EOF
c 0 "feat: config defaults"

cat > src/http.js <<'EOF'
const cfg = require('./config');
exports.requestOptions = () => ({ timeout: cfg.timeoutMs, retries: cfg.retries });
EOF
c 1 "feat: http request options"

cat > src/legacy_session.js <<'EOF'
// Old cookie session helper, kept for the v0 importer.
exports.makeSession = (id) => ({ id, created: 0 });
EOF
c 2 "feat: legacy session helper"

for k in 1 2 3 4 5 6 7 8 9 10; do
  n=$(printf '%02d' $k)
  printf 'exports.f%s = (x) => x * %s + %s;\n' "$n" "$k" "$k" > "src/m$n.js"
  c $((k % 3)) "feat: add module $n"
  cat > "test/m$n.test.js" <<EOF
const test = require('node:test');
const assert = require('node:assert');
const { f$n } = require('../src/m$n');
test('f$n scales', () => { assert.equal(f$n(2), $((3 * k))); });
EOF
  c $(((k + 1) % 3)) "test: cover module $n"
done

git checkout -q -b feature/rate-limit

cat > src/ratelimit.js <<'EOF'
exports.createLimiter = ({ burst = 5 } = {}) => {
  let used = 0;
  return {
    allow() {
      if (used >= burst) return false;
      used++;
      return true;
    },
  };
};
EOF
c 1 "feat: token limiter"

cat > test/ratelimit.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { createLimiter } = require('../src/ratelimit');
test('denies after burst', () => {
  const l = createLimiter({ burst: 2 });
  assert.equal(l.allow(), true);
  assert.equal(l.allow(), true);
  assert.equal(l.allow(), false);
});
EOF
c 1 "test: limiter basics"

cat > src/config.js <<'EOF'
module.exports = {
  timeoutMs: 5000,
  retries: 3,
  cacheTtl: 60,
};
EOF
c 2 "chore: tidy config"

printf '# ledger-core\n\nSmall internal library: config, http options, helper modules, rate limiter.\n\n## Config\n\nDefaults live in `src/config.js`.\n' > README.md
git rm -q src/legacy_session.js
c 1 "docs: readme wording"

cat > src/ratelimit.js <<'EOF'
exports.createLimiter = ({ burst = 5 } = {}) => {
  let used = 0;
  return {
    allow() {
      if (used >= burst) return false;
      used++;
      return true;
    },
    refill(n = burst) { used = Math.max(0, used - n); },
  };
};
EOF
c 1 "feat: limiter refill"

ident 1; tick
git revert --no-edit HEAD >/dev/null

cat > src/ratelimit.js <<'EOF'
exports.createLimiter = ({ burst = 10 } = {}) => {
  let used = 0;
  return {
    allow() {
      if (used >= burst) return false;
      used++;
      return true;
    },
    refill(n = burst) { used = Math.max(0, used - n); },
  };
};
EOF
cat >> test/ratelimit.test.js <<'EOF'
test('default burst is 10 and refill restores', () => {
  const l = createLimiter();
  for (let i = 0; i < 10; i++) assert.equal(l.allow(), true);
  assert.equal(l.allow(), false);
  l.refill(1);
  assert.equal(l.allow(), true);
});
EOF
c 1 "feat: limiter refill"

git checkout -q main

cat > src/m03.js <<'EOF'
exports.f03 = (x) => (x < 0 ? 0 : x * 3 + 3);
EOF
cat >> test/m03.test.js <<'EOF'
test('f03 clamps negatives', () => { assert.equal(f03(-5), 0); });
EOF
c 0 "fix: m03 negative input"

printf '# Changelog\n\n## 1.4.0\n- Initial public layout\n- Fix negative input in module 03\n' > CHANGELOG.md
c 0 "docs: changelog for m03 fix"
git status --short
