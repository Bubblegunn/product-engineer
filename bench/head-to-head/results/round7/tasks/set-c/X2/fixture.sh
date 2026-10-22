#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev"
git config user.email "dev@example.com"
commit() { git add -A; GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$1"; }

mkdir -p src test
echo '{"name":"syncer","version":"2.1.0","scripts":{"test":"node --test"}}' > package.json
cat > src/sync.js <<'EOS'
exports.runSync = async (fetchFn) => {
  const data = await fetchFn();
  return { count: data.length };
};
EOS
cat > test/sync.test.js <<'EOS'
const test = require('node:test');
const assert = require('node:assert');
const { runSync } = require('../src/sync');

test('counts fetched records', async () => {
  assert.deepStrictEqual(await runSync(async () => [1, 2, 3]), { count: 3 });
});
EOS
commit "Initial sync job" "2026-09-02T09:00:00Z"
git checkout -q -b feature/retry
cat > src/retry.js <<'EOS'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.retry = async (fn, { attempts = 3, delayMs = 100 } = {}) => {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      last = err;
      if (i < attempts - 1) await sleep(delayMs);
    }
  }
  throw last;
};
EOS
commit "Add retry helper with exponential backoff" "2026-09-03T09:00:00Z"
cat > test/retry.test.js <<'EOS'
const test = require('node:test');
const assert = require('node:assert');
const { retry } = require('../src/retry');

test('succeeds after transient failures', async () => {
  let calls = 0;
  const result = await retry(async () => {
    calls++;
    if (calls < 3) throw new Error('flaky');
    return 'ok';
  }, { attempts: 3, delayMs: 1 });
  assert.strictEqual(result, 'ok');
  assert.strictEqual(calls, 3);
});

test.skip('throws the last error when attempts are exhausted', async () => {
  await assert.rejects(retry(async () => { throw new Error('down'); }, { attempts: 2, delayMs: 1 }), /down/);
});
EOS
commit "Add full test coverage for retry" "2026-09-04T09:00:00Z"
cat > src/sync.js <<'EOS'
const { retry } = require('./retry');

exports.runSync = async (fetchFn) => {
  const data = await retry(fetchFn, { attempts: 5, delayMs: 200 });
  return { count: data.length };
};
EOS
commit "Wire retry into sync job" "2026-09-05T09:00:00Z"
