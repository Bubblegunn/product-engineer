#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Mina Okafor"
git config user.email "mina@example.test"

setid() {
  case "$1" in
    mina) N="Mina Okafor"; E="mina@example.test";;
    jonas) N="Jonas Keller"; E="jonas@example.test";;
    lena) N="Lena Ortiz"; E="lena@example.test";;
  esac
  export GIT_AUTHOR_NAME="$N" GIT_AUTHOR_EMAIL="$E" GIT_COMMITTER_NAME="$N" GIT_COMMITTER_EMAIL="$E" \
    GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2"
}
ci() { setid "$1" "$2"; git add -A; git commit -q -m "$3"; }
rv() { setid "$1" "$2"; git revert --no-edit "$3" >/dev/null; }

mkdir -p src bin config docs tests

# --- history up to v1.2.0 ---
cat > package.json <<'EOF'
{
  "name": "hookrelay",
  "version": "1.0.0",
  "description": "Forward incoming webhook payloads to one target URL with signing and retries",
  "main": "src/relay.js",
  "bin": { "hookrelay": "bin/hookrelay.js" },
  "scripts": { "test": "node --test" },
  "license": "MIT"
}
EOF
cat > .gitignore <<'EOF'
node_modules/
dead-letter/
EOF
cat > README.md <<'EOF'
# hookrelay

Receives webhook payloads and forwards them to one target URL. Every request is
signed and failed deliveries are retried.

## Quick start

    export HOOKRELAY_URL=https://example.test/hooks
    export HOOKRELAY_SECRET=changeme-local
    node bin/hookrelay.js --config config/default.json

See `docs/configuration.md` for all settings.

## Tests

    node --test
EOF
ci mina "2026-05-04T09:00:00" "chore: project skeleton"

cat > config/default.json <<'EOF'
{
  "targetUrl": "",
  "requestTimeoutMs": 30000,
  "retryCount": 3,
  "logLevel": "info"
}
EOF
cat > src/config.js <<'EOF'
const fs = require('fs');
const path = require('path');

function load(file, env = process.env) {
  const p = file || path.join(__dirname, '..', 'config', 'default.json');
  const base = JSON.parse(fs.readFileSync(p, 'utf8'));
  return {
    ...base,
    targetUrl: env.HOOKRELAY_URL || base.targetUrl,
    secret: env.HOOKRELAY_SECRET || 'changeme-local',
  };
}

module.exports = { load };
EOF
cat > tests/config.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('../src/config');

test('defaults are read from the file', () => {
  const c = load(undefined, {});
  assert.strictEqual(c.retryCount, 3);
  assert.strictEqual(c.logLevel, 'info');
});

test('env overrides target', () => {
  const c = load(undefined, { HOOKRELAY_URL: 'https://x.test' });
  assert.strictEqual(c.targetUrl, 'https://x.test');
});
EOF
ci mina "2026-05-04T11:00:00" "feat: config loader"

cat > src/sign.js <<'EOF'
const crypto = require('crypto');

function sign(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

module.exports = { sign };
EOF
cat > tests/sign.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { sign } = require('../src/sign');

test('signature is stable hex', () => {
  const a = sign('{"a":1}', 'k');
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.strictEqual(a, sign('{"a":1}', 'k'));
  assert.notStrictEqual(a, sign('{"a":2}', 'k'));
});
EOF
ci jonas "2026-05-05T10:00:00" "feat: HMAC signing"

cat > src/retry.js <<'EOF'
async function withRetry(fn, attempts) {
  let last;
  for (let i = 0; i < attempts - 1; i++) {
    try {
      return await fn(i);
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

module.exports = { withRetry };
EOF
cat > tests/retry.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { withRetry } = require('../src/retry');

test('succeeds after failures', async () => {
  let n = 0;
  const r = await withRetry(async () => {
    n++;
    if (n < 2) throw new Error('boom');
    return 'ok';
  }, 3);
  assert.strictEqual(r, 'ok');
});
EOF
ci jonas "2026-05-06T10:00:00" "feat: retry helper"

cat > src/relay.js <<'EOF'
const { sign } = require('./sign');
const { withRetry } = require('./retry');

async function deliver(payload, cfg, send) {
  const body = JSON.stringify(payload);
  const headers = {
    'content-type': 'application/json',
    'X-Hook-Signature': sign(body, cfg.secret),
  };
  return withRetry(() => send(cfg.targetUrl, body, headers, cfg.requestTimeoutMs), cfg.retryCount);
}

module.exports = { deliver };
EOF
cat > tests/relay.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { deliver } = require('../src/relay');

const cfg = { targetUrl: 'https://t.test', secret: 'k', requestTimeoutMs: 1000, retryCount: 3 };

test('delivers with signature header', async () => {
  let seen;
  await deliver({ a: 1 }, cfg, async (url, body, headers) => { seen = headers; });
  assert.match(seen['X-Hook-Signature'], /^[0-9a-f]{64}$/);
});
EOF
ci mina "2026-05-07T09:30:00" "feat: deliver with signing and retry"

cat > src/logger.js <<'EOF'
const LEVELS = ['debug', 'info', 'warn', 'error'];

function makeLogger(level, out = console.log) {
  const min = LEVELS.indexOf(level);
  const log = {};
  LEVELS.forEach((l, i) => { log[l] = (...a) => { if (i >= min) out(l, ...a); }; });
  return log;
}

module.exports = { makeLogger };
EOF
cat > tests/logger.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { makeLogger } = require('../src/logger');

test('respects level', () => {
  const seen = [];
  const log = makeLogger('warn', (...a) => seen.push(a[0]));
  log.info('x');
  log.error('y');
  assert.deepStrictEqual(seen, ['error']);
});
EOF
ci jonas "2026-05-08T14:00:00" "feat: leveled logger"

cat > src/cli.js <<'EOF'
function parseArgs(argv) {
  const out = { config: undefined, dryRun: false, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') out.config = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--verbose') out.verbose = true;
  }
  return out;
}

module.exports = { parseArgs };
EOF
cat > bin/hookrelay.js <<'EOF'
#!/usr/bin/env node
const { parseArgs } = require('../src/cli');
const { load } = require('../src/config');
const { makeLogger } = require('../src/logger');

const args = parseArgs(process.argv.slice(2));
const cfg = load(args.config);
const log = makeLogger(args.verbose ? 'debug' : cfg.logLevel);
log.info('hookrelay ready, target', cfg.targetUrl || '(none)');
if (args.dryRun) log.info('dry run, nothing is sent');
EOF
cat > tests/cli.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { parseArgs } = require('../src/cli');

test('parses flags', () => {
  const a = parseArgs(['--config', 'x.json', '--dry-run', '--verbose']);
  assert.strictEqual(a.config, 'x.json');
  assert.strictEqual(a.dryRun, true);
  assert.strictEqual(a.verbose, true);
});
EOF
ci mina "2026-05-12T10:00:00" "feat: command line entry point"

cat > docs/configuration.md <<'EOF'
# Configuration

Settings live in `config/default.json`. Pass another file with `--config`.

| Setting            | Default | Meaning                                         |
|--------------------|---------|-------------------------------------------------|
| `targetUrl`        | empty   | Where payloads are forwarded                    |
| `requestTimeoutMs` | 30000   | Give up on one request after this many ms       |
| `retryCount`       | 3       | Number of delivery attempts                     |
| `logLevel`         | info    | debug, info, warn or error                      |

## Environment variables

- `HOOKRELAY_URL` sets `targetUrl`
- `HOOKRELAY_SECRET` sets the signing secret (default `changeme-local`)

## Command line

- `--config <file>`, `--dry-run`, `--verbose` (same as `logLevel: debug`)
EOF
ci mina "2026-05-12T15:00:00" "docs: configuration reference"

sed -i.bak 's/i < attempts - 1/i < attempts/' src/retry.js && rm src/*.bak
cat >> tests/retry.test.js <<'EOF'

test('makes exactly the requested number of attempts', async () => {
  let n = 0;
  await assert.rejects(withRetry(async () => { n++; throw new Error('x'); }, 3));
  assert.strictEqual(n, 3);
});
EOF
ci jonas "2026-05-19T09:00:00" "fix: retry attempted one time too few"

cat > CHANGELOG.md <<'EOF'
# Changelog

## 1.2.0 - 2026-06-02
- Retry count is now exact (no more missing last attempt)
- Added `--dry-run`
- Added configuration reference

## 1.0.0 - 2026-05-12
- First release
EOF
sed -i.bak 's/"version": "1.0.0"/"version": "1.2.0"/' package.json && rm package.json.bak
ci mina "2026-06-02T10:00:00" "chore: release 1.2.0"
git tag -a v1.2.0 -m "hookrelay 1.2.0"

# --- after v1.2.0 ---
sed -i.bak 's/"logLevel": "info"/"logLevel": "info",\n  "signatureHeader": "X-Hook-Signature"/' config/default.json && rm config/default.json.bak
sed -i.bak "s/'X-Hook-Signature': sign/[cfg.signatureHeader || 'X-Hook-Signature']: sign/" src/relay.js && rm src/relay.js.bak
cat >> tests/relay.test.js <<'EOF'

test('signature header name is configurable', async () => {
  let seen;
  await deliver({ a: 1 }, { ...cfg, signatureHeader: 'X-Acme-Sig' }, async (u, b, headers) => { seen = headers; });
  assert.ok(seen['X-Acme-Sig']);
});
EOF
ci jonas "2026-06-16T10:00:00" "feat: configurable signature header"

cat > config/default.json <<'EOF'
{
  "targetUrl": "",
  "requestTimeoutMs": 5000,
  "retryCount": 5,
  "logLevel": "info",
  "signatureHeader": "X-Hook-Signature"
}
EOF
sed -i.bak 's/assert.strictEqual(c.retryCount, 3);/assert.strictEqual(c.retryCount, 5);/' tests/config.test.js && rm tests/*.bak
ci lena "2026-06-23T16:20:00" "chore: tidy defaults"

sed -i.bak 's/HOOKRELAY_URL/HOOKRELAY_TARGET_URL/g' src/config.js tests/config.test.js && rm src/*.bak tests/*.bak
ci lena "2026-06-24T09:15:00" "refactor: consistent env names"

cat > src/batch.js <<'EOF'
function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

module.exports = { chunk };
EOF
cat > tests/batch.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { chunk } = require('../src/batch');

test('chunks lists', () => {
  assert.deepStrictEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
});
EOF
ci jonas "2026-07-01T10:00:00" "feat: batch delivery"
BATCH=$(git rev-parse HEAD)

cat >> README.md <<'EOF'

## Batching

Set `batchSize` in the config to send several payloads in one request.
EOF
cat >> docs/configuration.md <<'EOF'

## Batching

`batchSize` (default 1) groups payloads into one request.
EOF
ci jonas "2026-07-01T10:40:00" "docs: describe batching"

sed -i.bak 's/const body = JSON.stringify(payload);/if (payload == null) throw new Error("empty payload");\n  const body = JSON.stringify(payload);/' src/relay.js && rm src/*.bak
cat >> tests/relay.test.js <<'EOF'

test('rejects empty payload', async () => {
  await assert.rejects(deliver(null, cfg, async () => {}));
});
EOF
ci mina "2026-07-06T11:00:00" "fix: reject empty payloads"

rv lena "2026-07-14T17:05:00" "$BATCH"

mkdir -p src
cat > src/deadletter.js <<'EOF'
const fs = require('fs');
const path = require('path');

function record(cfg, payload) {
  if (!cfg.deadLetterPath) return false;
  fs.mkdirSync(cfg.deadLetterPath, { recursive: true });
  const f = path.join(cfg.deadLetterPath, Date.now() + '.json');
  fs.writeFileSync(f, JSON.stringify(payload));
  return f;
}

module.exports = { record };
EOF
cat > src/relay.js <<'EOF'
const { sign } = require('./sign');
const { withRetry } = require('./retry');
const { record } = require('./deadletter');

async function deliver(payload, cfg, send) {
  if (payload == null) throw new Error("empty payload");
  const body = JSON.stringify(payload);
  const headers = {
    'content-type': 'application/json',
    [cfg.signatureHeader || 'X-Hook-Signature']: sign(body, cfg.secret),
  };
  try {
    return await withRetry(() => send(cfg.targetUrl, body, headers, cfg.requestTimeoutMs), cfg.retryCount);
  } catch (e) {
    record(cfg, payload);
    throw e;
  }
}

module.exports = { deliver };
EOF
cat > tests/deadletter.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { record } = require('../src/deadletter');

test('does nothing without a path', () => {
  assert.strictEqual(record({}, { a: 1 }), false);
});

test('writes a file when configured', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'));
  const f = record({ deadLetterPath: dir }, { a: 1 });
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(f, 'utf8')), { a: 1 });
  fs.rmSync(dir, { recursive: true });
});
EOF
sed -i.bak 's/"signatureHeader": "X-Hook-Signature"/"signatureHeader": "X-Hook-Signature",\n  "deadLetterPath": null/' config/default.json && rm config/default.json.bak
ci jonas "2026-07-20T10:00:00" "feat: keep failed payloads in a dead-letter folder"
DL=$(git rev-parse HEAD)

rv lena "2026-07-21T08:30:00" "$DL"
RV=$(git rev-parse HEAD)
rv jonas "2026-07-22T09:00:00" "$RV"

cat > src/cli.js <<'EOF'
function parseArgs(argv) {
  const out = { config: undefined, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') out.config = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else throw new Error('unknown option: ' + a);
  }
  return out;
}

module.exports = { parseArgs };
EOF
cat > tests/cli.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { parseArgs } = require('../src/cli');

test('parses flags', () => {
  const a = parseArgs(['--config', 'x.json', '--dry-run']);
  assert.strictEqual(a.config, 'x.json');
  assert.strictEqual(a.dryRun, true);
});

test('unknown options are rejected', () => {
  assert.throws(() => parseArgs(['--bogus']));
});
EOF
sed -i.bak "s/makeLogger(args.verbose ? 'debug' : cfg.logLevel)/makeLogger(cfg.logLevel)/" bin/hookrelay.js && rm bin/*.bak
ci mina "2026-07-27T10:00:00" "fix: cli parsing"

cat >> tests/relay.test.js <<'EOF'

test('retries up to retryCount then fails', async () => {
  let n = 0;
  await assert.rejects(deliver({ a: 1 }, { ...cfg, retryCount: 5 }, async () => { n++; throw new Error('down'); }));
  assert.strictEqual(n, 5);
});
EOF
ci jonas "2026-07-28T13:00:00" "test: retry exhaustion"

sed -i.bak 's/"version": "1.2.0"/"version": "1.3.0-rc.1"/' package.json && rm package.json.bak
ci mina "2026-08-03T09:00:00" "chore: bump to 1.3.0-rc.1"

cat >> docs/configuration.md <<'EOF'

## Notes

Timeouts are per request, not per delivery.
EOF
ci lena "2026-08-04T12:00:00" "docs: timeout note"
