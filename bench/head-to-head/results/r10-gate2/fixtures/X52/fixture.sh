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
  d=$(printf '2025-05-%02dT%02d:00:00Z' $((1 + N / 6)) $((8 + N % 6 * 2)))
  git add -A
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}

mkdir -p src/queue src/util test docs examples data

cat > package.json <<'EOF'
{
  "name": "fetchly",
  "version": "1.4.0",
  "main": "src/client.js",
  "bin": { "fetchly": "src/cli.js" },
  "scripts": { "test": "node --test" }
}
EOF

cat > src/backoff.js <<'EOF'
function backoffDelay(attempt) {
  return Math.min(30000, 100 * 2 ** attempt);
}
module.exports = { backoffDelay };
EOF

cat > src/client.js <<'EOF'
const { backoffDelay } = require('./backoff');

const DEFAULTS = { timeout: 5000, retries: 3 };

function createClient(opts = {}) {
  const cfg = { sleep: () => Promise.resolve(), ...DEFAULTS, ...opts };

  async function request(url, doFetch = globalThis.fetch) {
    let attempt = 0;
    let lastErr;
    while (attempt <= cfg.retries) {
      try {
        return await doFetch(url, { timeout: cfg.timeout });
      } catch (err) {
        lastErr = err;
        attempt += 1;
        await cfg.sleep(backoffDelay(attempt));
      }
    }
    throw lastErr;
  }

  return { request, getConfig: () => ({ ...cfg }) };
}

module.exports = { createClient, DEFAULTS };
EOF

cat > test/client.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { createClient } = require('../src/client');

test('default retries is 3', () => {
  assert.strictEqual(createClient().getConfig().retries, 3);
});

test('request retries then gives up', async () => {
  let calls = 0;
  const client = createClient({ retries: 2 });
  await assert.rejects(client.request('http://x', async () => { calls += 1; throw new Error('boom'); }));
  assert.strictEqual(calls, 3);
});

test('request returns on success', async () => {
  const client = createClient({ retries: 1 });
  const r = await client.request('http://x', async () => 'ok');
  assert.strictEqual(r, 'ok');
});
EOF
commit "feat: http client with retries and backoff"

cat > src/presets.js <<'EOF'
const { createClient } = require('./client');

const presets = {
  flaky: { timeout: 15000, retries: 6 },
  fast: { timeout: 1000, retries: 0 },
};

function fromPreset(name, extra = {}) {
  if (!presets[name]) throw new Error('unknown preset: ' + name);
  return createClient({ ...presets[name], ...extra });
}

module.exports = { presets, fromPreset };
EOF
cat > test/presets.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { presets, fromPreset } = require('../src/presets');

test('flaky preset retries six times', () => {
  assert.strictEqual(presets.flaky.retries, 6);
  assert.strictEqual(fromPreset('flaky').getConfig().retries, 6);
});

test('unknown preset throws', () => {
  assert.throws(() => fromPreset('nope'));
});
EOF
commit "feat: presets"

cat > src/cli.js <<'EOF'
#!/usr/bin/env node
const { createClient } = require('./client');

function parseArgs(argv, env = {}) {
  const opts = {};
  if (env.FETCHLY_RETRIES) opts.retries = Number(env.FETCHLY_RETRIES);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--retries') opts.retries = Number(argv[++i]);
    else if (argv[i] === '--timeout') opts.timeout = Number(argv[++i]);
  }
  return opts;
}

async function main(argv, env) {
  const url = argv.find((a) => /^https?:/.test(a));
  const client = createClient(parseArgs(argv, env));
  return client.request(url);
}

if (require.main === module) {
  main(process.argv.slice(2), process.env).then(
    (r) => console.log(r.status),
    (e) => { console.error(e.message); process.exit(1); },
  );
}

module.exports = { parseArgs, main };
EOF
cat > test/cli.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { parseArgs } = require('../src/cli');

test('--retries flag', () => {
  assert.deepStrictEqual(parseArgs(['--retries', '4', 'http://x']), { retries: 4 });
});

test('env var', () => {
  assert.deepStrictEqual(parseArgs([], { FETCHLY_RETRIES: '2' }), { retries: 2 });
});

test('--timeout flag', () => {
  assert.deepStrictEqual(parseArgs(['--timeout', '900']), { timeout: 900 });
});
EOF
commit "feat: command line"

cat > src/queue/worker.js <<'EOF'
// Background job queue. A job's `retries` is how many re-queues it has left
// before it is marked dead. Unrelated to the HTTP client option.
function nextState(job) {
  if (!job.failed) return { ...job, state: 'done' };
  if (job.retries > 0) return { ...job, retries: job.retries - 1, failed: false, state: 'queued' };
  return { ...job, state: 'dead' };
}
module.exports = { nextState };
EOF
cat > src/queue/store.js <<'EOF'
const fs = require('node:fs');
const path = require('node:path');

function loadJobs(file = path.join(__dirname, '..', '..', 'data', 'jobs.json')) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
module.exports = { loadJobs };
EOF
cat > data/jobs.json <<'EOF'
[
  { "id": "j1", "url": "https://example.com/a", "retries": 2, "state": "queued" },
  { "id": "j2", "url": "https://example.com/b", "retries": 0, "state": "queued" }
]
EOF
cat > test/queue.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { nextState } = require('../src/queue/worker');
const { loadJobs } = require('../src/queue/store');

test('failed job with retries left is re-queued', () => {
  const j = nextState({ id: 'a', failed: true, retries: 2 });
  assert.strictEqual(j.state, 'queued');
  assert.strictEqual(j.retries, 1);
});

test('failed job without retries is dead', () => {
  assert.strictEqual(nextState({ id: 'a', failed: true, retries: 0 }).state, 'dead');
});

test('stored jobs carry retries', () => {
  assert.strictEqual(loadJobs()[0].retries, 2);
});
EOF
commit "feat(queue): background job queue"

cat > examples/sync.js <<'EOF'
const { createClient } = require('../src/client');

const client = createClient({ timeout: 8000, retries: 2 });

client.request('https://example.com/api/items').then((r) => console.log(r.status));
EOF
cat > README.md <<'EOF'
# fetchly

Tiny HTTP client with retries and exponential backoff.

```js
const { createClient } = require('fetchly');
const client = createClient({ timeout: 8000, retries: 2 });
```

`retries` is the number of extra attempts after the first failure (default 3).
See docs/options.md for every option and the command line.
EOF
cat > docs/options.md <<'EOF'
# Options

| Option    | Default | Meaning                                         |
|-----------|---------|-------------------------------------------------|
| `timeout` | 5000    | Milliseconds before one attempt is abandoned.   |
| `retries` | 3       | Extra attempts after the first failure.         |

## Presets

`flaky` uses `retries: 6`, `fast` uses `retries: 0`.

## Command line

    fetchly --retries 4 --timeout 900 https://example.com

The same value can come from the `FETCHLY_RETRIES` environment variable.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## 1.4.0
- presets: `flaky` and `fast`.
- `retries` can be set with `FETCHLY_RETRIES`.

## 1.3.0
- Queue worker. Jobs carry their own `retries` counter.

## 1.2.0
- Added the `retries` option to createClient (default 3).
EOF
commit "docs: README, option table, changelog, example"

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
isUrl|function isUrl(s) { return /^https?:\/\//.test(s); }|isUrl('http://a.b'), true
joinPath|function joinPath(a, b) { return a.replace(/\/+$/, '') + '/' + b.replace(/^\/+/, ''); }|joinPath('a/', '/b'), 'a/b'
sleep|function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }|typeof sleep(0).then, 'function'
pick|function pick(o, k) { return k.reduce((r, x) => (x in o ? { ...r, [x]: o[x] } : r), {}); }|Object.keys(pick({ a: 1, b: 2 }, ['a'])).length, 1
EOF

printf 'node_modules/\n*.log\n' > .gitignore
commit "chore: add .gitignore"

cat > docs/queue.md <<'DOC'
# Queue

Each job has its own `retries` counter: re-queues left before the job is dead.
It is stored in data/jobs.json and is separate from the HTTP client options.
DOC
commit "docs: describe the job queue"
