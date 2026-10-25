#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dana Ruiz"
git config user.email "dana@example.test"
N=0
c() {
  N=$((N+1)); local t=$((1740000000 + N*53000)) an ae
  case $1 in d) an="Dana Ruiz"; ae="dana@example.test";; t) an="Tom Okafor"; ae="tom@example.test";; l) an="Lena Vogt"; ae="lena@example.test";; esac
  git add -A
  GIT_AUTHOR_NAME="$an" GIT_AUTHOR_EMAIL="$ae" GIT_COMMITTER_NAME="$an" GIT_COMMITTER_EMAIL="$ae" \
  GIT_AUTHOR_DATE="$t +0000" GIT_COMMITTER_DATE="$t +0000" git commit -q -m "$2"
}
mkdir -p src test docs/releases .github/workflows

cat > package.json <<'EOF'
{
  "name": "retryfetch",
  "version": "2.3.0",
  "description": "fetch wrapper with retries, backoff and timeouts",
  "main": "src/index.js",
  "scripts": { "test": "node --test" },
  "engines": { "node": ">=16" },
  "devDependencies": { "prettier": "3.0.0" }
}
EOF
printf 'node_modules/\n' > .gitignore
cat > README.md <<'EOF'
# retryfetch

A small wrapper around `fetch` that retries failed requests with exponential
backoff and enforces a timeout.

    const { retrying } = require('retryfetch');
    const res = await retrying(fetch, 'https://api.example.test/items', { retries: 3 });

By default a request times out after 30 seconds. See docs/options.md.
EOF
c d "first version"

cat > src/defaults.js <<'EOF'
'use strict';

const LEGACY_SLOW_TIMEOUT = 120000;

module.exports = {
  retries: 3,
  baseDelayMs: 200,
  maxDelayMs: 5000,
  timeoutMs: 30000,
  jitter: false,
};
EOF
sed -i.bak '/jitter: false,/d' src/defaults.js && rm -f src/defaults.js.bak
cat > src/backoff.js <<'EOF'
'use strict';

function backoff(attempt, o) {
  return Math.min(o.baseDelayMs * 2 ** attempt, o.maxDelayMs);
}

module.exports = { backoff };
EOF
cat > src/errors.js <<'EOF'
'use strict';

class TimeoutError extends Error {
  constructor(ms) {
    super(`Request timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

module.exports = { TimeoutError };
EOF
c d "defaults, backoff, errors"

cat > src/retry.js <<'EOF'
'use strict';
const defaults = require('./defaults');
const { backoff } = require('./backoff');
const { TimeoutError } = require('./errors');

const realSleep = (ms) => new Promise((r) => setTimeout(r, ms));

function shouldRetry(status) {
  return status >= 400;
}

function withTimeout(fetchFn, url, o) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(o.timeoutMs)), o.timeoutMs);
    const ctl = new AbortController();
    if (o.signal) o.signal.addEventListener('abort', () => ctl.abort());
    fetchFn(url, { signal: ctl.signal }).then(
      (r) => { clearTimeout(timer); resolve(r); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function retrying(fetchFn, url, opts = {}) {
  const o = Object.assign({}, defaults, opts);
  const sleep = o.sleep || realSleep;
  let attempt = 0;
  for (;;) {
    try {
      const res = await withTimeout(fetchFn, url, o);
      if (!shouldRetry(res.status) || attempt >= o.retries) return res;
    } catch (e) {
      if (e.name === 'AbortError' || attempt >= o.retries) throw e;
    }
    await sleep(backoff(attempt, o));
    attempt++;
  }
}

module.exports = { retrying, shouldRetry };
EOF
cat > src/index.js <<'EOF'
'use strict';
const { retrying } = require('./retry');
const defaults = require('./defaults');

module.exports = { retrying, defaults };
EOF
c d "retrying()"

cat > test/helpers.js <<'EOF'
'use strict';

function fakeFetch(statuses) {
  let i = 0;
  const f = async () => ({ status: statuses[Math.min(i++, statuses.length - 1)] });
  f.calls = () => i;
  return f;
}

module.exports = { fakeFetch, noSleep: async () => {} };
EOF
cat > test/retry.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { retrying } = require('../src');
const { fakeFetch, noSleep } = require('./helpers');

test('returns first success', async () => {
  const f = fakeFetch([200]);
  const r = await retrying(f, 'u', { sleep: noSleep });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(f.calls(), 1);
});

test('retries server errors then succeeds', async () => {
  const f = fakeFetch([503, 503, 200]);
  const r = await retrying(f, 'u', { sleep: noSleep });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(f.calls(), 3);
});

test('gives up after the retry budget', async () => {
  const f = fakeFetch([500]);
  const r = await retrying(f, 'u', { sleep: noSleep, retries: 2 });
  assert.strictEqual(r.status, 500);
  assert.strictEqual(f.calls(), 3);
});
EOF
cat > test/backoff.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { backoff } = require('../src/backoff');

test('doubles and caps', () => {
  const o = { baseDelayMs: 100, maxDelayMs: 500 };
  assert.deepStrictEqual([0, 1, 2, 3, 4].map((a) => backoff(a, o)), [100, 200, 400, 500, 500]);
});
EOF
c t "tests"

cat > docs/options.md <<'EOF'
# Options

| Option | Default | Meaning |
|--------|---------|---------|
| `retries` | 3 | extra attempts after the first |
| `baseDelayMs` | 200 | first backoff delay |
| `maxDelayMs` | 5000 | cap for the backoff delay |
| `timeoutMs` | 30000 | per-attempt timeout |
| `signal` | none | an AbortSignal to cancel the request |
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## 2.2.0
- `signal` option

## 2.0.0
- Rewrite around injected fetch
EOF
c l "options doc and changelog"

cat > .github/workflows/ci.yml <<'EOF'
name: ci
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [16, 18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
EOF
c t "ci"
printf '\nSee docs/releases for past release notes.\n' >> README.md
c l "readme link"
cat > docs/releases/2.2.0.md <<'EOF'
# retryfetch 2.2.0

**New**
- You can now cancel a request with the `signal` option.

**Upgrading**
No action needed.
EOF
c d "release notes for 2.2.0"
printf '\n// keep exports stable\n' >> src/index.js
c t "comment"
printf '\n## 2.3.0\n- Internal refactor of the retry loop\n' >> CHANGELOG.md
cat > docs/releases/2.3.0.md <<'EOF'
# retryfetch 2.3.0

**Improved**
- Cleaner internals; no behaviour changes.

**Upgrading**
No action needed.
EOF
c d "release 2.3.0"
git tag -a v2.3.0 -m "2.3.0"

# ---- after 2.3.0 ----
cat > src/backoff.js <<'EOF'
'use strict';

function backoff(attempt, o, rand = Math.random) {
  const base = Math.min(o.baseDelayMs * 2 ** attempt, o.maxDelayMs);
  return o.jitter ? Math.floor(rand() * base) : base;
}

module.exports = { backoff };
EOF
sed -i.bak "s/  timeoutMs: 30000,/  timeoutMs: 30000,\n  jitter: false,/" src/defaults.js && rm -f src/defaults.js.bak
printf '| `jitter` | false | randomise each delay between 0 and the computed backoff |\n' >> docs/options.md
cat >> test/backoff.test.js <<'EOF'

test('jitter spreads the delay', () => {
  const o = { baseDelayMs: 100, maxDelayMs: 500, jitter: true };
  assert.strictEqual(backoff(1, o, () => 0.5), 100);
});
EOF
c t "add jitter option to backoff"

sed -i.bak 's/  timeoutMs: 30000,/  timeoutMs: 10000,/; /LEGACY_SLOW_TIMEOUT/d' src/defaults.js && rm -f src/defaults.js.bak
c d "tidy defaults"

cat > src/retry_abort_patch.tmp <<'EOF'
EOF
rm src/retry_abort_patch.tmp
python3 - <<'EOF'
import re
p='src/retry.js'
s=open(p).read()
s=s.replace("""    if (o.signal) o.signal.addEventListener('abort', () => ctl.abort());
    fetchFn(url, { signal: ctl.signal }).then(
      (r) => { clearTimeout(timer); resolve(r); },
      (e) => { clearTimeout(timer); reject(e); }
    );""","""    const onAbort = () => ctl.abort();
    if (o.signal) o.signal.addEventListener('abort', onAbort);
    const done = () => {
      clearTimeout(timer);
      if (o.signal) o.signal.removeEventListener('abort', onAbort);
    };
    fetchFn(url, { signal: ctl.signal }).then(
      (r) => { done(); resolve(r); },
      (e) => { done(); reject(e); }
    );""")
open(p,'w').write(s)
EOF
c l "free the abort listener once a request settles"

python3 - <<'EOF'
p='src/retry.js'
s=open(p).read()
s=s.replace("""      if (!shouldRetry(res.status) || attempt >= o.retries) return res;""","""      if (!shouldRetry(res.status) || attempt >= o.retries) return res;
      if (o.onRetry) o.onRetry({ attempt, status: res.status });""")
open(p,'w').write(s)
EOF
printf '| `onRetry` | none | callback before each retry |\n' >> docs/options.md
c t "feat: onRetry hook"
N=$((N+1)); RT=$((1740000000 + N*53000))
GIT_AUTHOR_NAME="Tom Okafor" GIT_AUTHOR_EMAIL="tom@example.test" GIT_COMMITTER_NAME="Tom Okafor" GIT_COMMITTER_EMAIL="tom@example.test" \
GIT_AUTHOR_DATE="$RT +0000" GIT_COMMITTER_DATE="$RT +0000" git revert --no-edit HEAD >/dev/null

cat > src/circuit.js <<'EOF'
'use strict';
// EXPERIMENTAL: API may change without a major version.
function circuitBreaker({ failureThreshold = 5, resetMs = 30000, now = Date.now } = {}) {
  let failures = 0;
  let openedAt = 0;
  return {
    canRequest() {
      if (failures < failureThreshold) return true;
      return now() - openedAt >= resetMs;
    },
    record(ok) {
      if (ok) { failures = 0; return; }
      failures++;
      if (failures === failureThreshold) openedAt = now();
    },
  };
}

module.exports = { circuitBreaker };
EOF
cat > src/index.js <<'EOF'
'use strict';
const { retrying } = require('./retry');
const defaults = require('./defaults');
const { circuitBreaker } = require('./circuit');

module.exports = { retrying, defaults, experimental: { circuitBreaker } };
EOF
cat > test/circuit.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { circuitBreaker } = require('../src/circuit');

test('opens after the threshold and closes after resetMs', () => {
  let t = 0;
  const cb = circuitBreaker({ failureThreshold: 2, resetMs: 1000, now: () => t });
  cb.record(false); cb.record(false);
  assert.strictEqual(cb.canRequest(), false);
  t = 1000;
  assert.strictEqual(cb.canRequest(), true);
});
EOF
printf '\n## Experimental\n`experimental.circuitBreaker()` is a standalone helper, not wired into `retrying`. Do not rely on its shape yet.\n' >> docs/options.md
c d "circuit breaker (experimental)"

sed -i.bak 's/node: \[16, 18, 20\]/node: [18, 20, 22]/' .github/workflows/ci.yml && rm -f .github/workflows/ci.yml.bak
sed -i.bak 's/"node": ">=16"/"node": ">=18"/' package.json && rm -f package.json.bak
c l "update CI matrix"

sed -i.bak 's/  return status >= 400;/  return status === 429 || status >= 500;/' src/retry.js && rm -f src/retry.js.bak
cat >> test/retry.test.js <<'EOF'

test('does not retry client errors', async () => {
  const f = fakeFetch([404, 200]);
  const r = await retrying(f, 'u', { sleep: noSleep });
  assert.strictEqual(r.status, 404);
  assert.strictEqual(f.calls(), 1);
});

test('retries 429', async () => {
  const f = fakeFetch([429, 200]);
  const r = await retrying(f, 'u', { sleep: noSleep });
  assert.strictEqual(r.status, 200);
});
EOF
c t "retry only on 429 and 5xx"

sed -i.bak 's/"prettier": "3.0.0"/"prettier": "3.3.3"/' package.json && rm -f package.json.bak
c t "bump dev deps"
sed -i.bak 's/per-attempt timeout/per-attempt timeout (ms)/' docs/options.md && rm -f docs/options.md.bak
c d "docs: clarify timeout unit"
sed -i.bak 's/A small wrapper/A tiny wrapper/' README.md && rm -f README.md.bak
c l "readme wording"
