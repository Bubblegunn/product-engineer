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

mkdir -p src/util test bin config docs examples
cat > package.json <<'EOF'
{
  "name": "shelf",
  "version": "1.4.0",
  "description": "Small in-memory cache with expiring entries",
  "main": "src/index.js",
  "bin": { "shelf": "bin/shelf.js" },
  "scripts": { "test": "node --test" },
  "license": "MIT"
}
EOF
cat > README.md <<'EOF'
# shelf

Small in-memory cache with expiring entries.

```js
const { createCache } = require('shelf');
const cache = createCache({ ttl: 60, maxEntries: 500 });
cache.set('user:1', { name: 'Ada' });
cache.get('user:1');
```

Options:

- `ttl`: how long an entry lives, in seconds (default 60).
- `maxEntries`: entries kept before the oldest is dropped (default 100).

See `docs/usage.md` and `docs/config.md`.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased

## 1.4.0
- Add `maxEntries` option.

## 1.3.0
- Add `shelf --print-config`.

## 1.0.0
- First release.
EOF
c "chore: project skeleton"

cat > src/util/clock.js <<'EOF'
'use strict';
let fixed = null;
exports.now = () => (fixed === null ? Date.now() : fixed);
exports.setNow = (t) => { fixed = t; };
EOF
c "feat(util): add injectable clock"

cat > src/cache.js <<'EOF'
'use strict';
const { now } = require('./util/clock');

const DEFAULT_TTL = 60; // seconds

function createCache(opts = {}) {
  const ttl = opts.ttl === undefined ? DEFAULT_TTL : opts.ttl;
  const maxEntries = opts.maxEntries || 100;
  const store = new Map();
  return {
    set(key, value) {
      if (store.size >= maxEntries && !store.has(key)) {
        store.delete(store.keys().next().value);
      }
      store.set(key, { value, expires: now() + ttl * 1000 });
    },
    get(key) {
      const e = store.get(key);
      if (!e) return undefined;
      if (e.expires <= now()) {
        store.delete(key);
        return undefined;
      }
      return e.value;
    },
    size() { return store.size; },
  };
}

module.exports = { createCache, DEFAULT_TTL };
EOF
cat > test/cache.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createCache } = require('../src/cache');
const clock = require('../src/util/clock');

test('entry expires after ttl seconds', () => {
  clock.setNow(1000000);
  const c = createCache({ ttl: 10 });
  c.set('a', 1);
  clock.setNow(1000000 + 9999);
  assert.strictEqual(c.get('a'), 1);
  clock.setNow(1000000 + 10000);
  assert.strictEqual(c.get('a'), undefined);
});

test('default ttl is 60 seconds', () => {
  clock.setNow(0);
  const c = createCache();
  c.set('a', 1);
  clock.setNow(59999);
  assert.strictEqual(c.get('a'), 1);
  clock.setNow(60000);
  assert.strictEqual(c.get('a'), undefined);
});

test('maxEntries drops oldest', () => {
  clock.setNow(0);
  const c = createCache({ maxEntries: 2 });
  c.set('a', 1); c.set('b', 2); c.set('c', 3);
  assert.strictEqual(c.get('a'), undefined);
  assert.strictEqual(c.size(), 2);
});
EOF
c "feat: expiring in-memory cache"

for spec in \
 "keys|join|(...p) => p.join(':')|join('a', 'b')|a:b" \
 "ids|prefix|(p, n) => p + '_' + n|prefix('u', 3)|u_3" \
 "stats|ratio|(a, b) => (b === 0 ? 0 : a / b)|ratio(1, 4)|0.25" ; do
  IFS='|' read -r f fn ex call exp <<<"$spec"
  case "$exp" in 0.25) e=0.25;; *) e="'$exp'";; esac
  util "$f" "$fn" "$ex" "$call" "$e"
done

cat > config/default.json <<'EOF'
{
  "ttl": 60,
  "maxEntries": 100
}
EOF
cat > src/config.js <<'EOF'
'use strict';
const fs = require('fs');
const path = require('path');

// Resolution order: config/default.json, then SHELF_TTL (seconds), then overrides.
function load(overrides = {}, env = process.env) {
  const file = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'config', 'default.json'), 'utf8')
  );
  const cfg = { ...file };
  if (env.SHELF_TTL) cfg.ttl = Number(env.SHELF_TTL);
  Object.assign(cfg, overrides);
  return cfg;
}

module.exports = { load };
EOF
cat > test/config.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('../src/config');

test('defaults come from config/default.json', () => {
  assert.deepStrictEqual(load({}, {}), { ttl: 60, maxEntries: 100 });
});
test('SHELF_TTL env overrides file', () => {
  assert.strictEqual(load({}, { SHELF_TTL: '5' }).ttl, 5);
});
test('explicit overrides win', () => {
  assert.strictEqual(load({ ttl: 7 }, { SHELF_TTL: '5' }).ttl, 7);
});
EOF
c "feat: layered config loader"

cat > src/session.js <<'EOF'
'use strict';
const { createCache } = require('./cache');

// Sessions live 30 minutes after last write.
function createSession(opts = {}) {
  const cache = createCache({ ttl: 1800, maxEntries: opts.max || 1000 });
  return {
    start(id, data) { cache.set(id, data); },
    read(id) { return cache.get(id); },
    count() { return cache.size(); },
  };
}

module.exports = { createSession };
EOF
cat > test/session.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createSession } = require('../src/session');
const clock = require('../src/util/clock');

test('session survives 29 minutes, gone after 30', () => {
  clock.setNow(0);
  const s = createSession();
  s.start('x', { u: 1 });
  clock.setNow(29 * 60 * 1000);
  assert.deepStrictEqual(s.read('x'), { u: 1 });
  clock.setNow(30 * 60 * 1000);
  assert.strictEqual(s.read('x'), undefined);
});
EOF
c "feat: session store on top of cache"

cat > src/index.js <<'EOF'
'use strict';
const { createCache } = require('./cache');
const { createSession } = require('./session');
const { load } = require('./config');

function createShelf(overrides) {
  return createCache(load(overrides));
}

module.exports = { createCache, createSession, createShelf, load };
EOF
c "feat: public entry point"

cat > bin/shelf.js <<'EOF'
#!/usr/bin/env node
'use strict';
const { load } = require('../src/config');

const args = process.argv.slice(2);
const overrides = {};
let print = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--ttl') overrides.ttl = Number(args[++i]);
  else if (args[i] === '--print-config') print = true;
  else if (args[i] === '--help') {
    console.log('Usage: shelf [--ttl <seconds>] [--print-config]');
    process.exit(0);
  } else {
    console.error('unknown argument: ' + args[i]);
    process.exit(2);
  }
}
const cfg = load(overrides);
if (print) console.log(JSON.stringify(cfg));
EOF
chmod +x bin/shelf.js
cat > test/cli.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const path = require('path');

const bin = path.join(__dirname, '..', 'bin', 'shelf.js');
function run(args) {
  const env = { ...process.env };
  delete env.SHELF_TTL;
  return execFileSync(process.execPath, [bin, ...args], { env }).toString().trim();
}

test('prints default config', () => {
  assert.strictEqual(run(['--print-config']), '{"ttl":60,"maxEntries":100}');
});
test('--ttl overrides', () => {
  assert.strictEqual(run(['--ttl', '5', '--print-config']), '{"ttl":5,"maxEntries":100}');
});
EOF
c "feat(cli): shelf --print-config and --ttl"

cat > examples/server.js <<'EOF'
'use strict';
// Tiny example: cache rendered pages for five minutes.
const { createCache } = require('../src');

const pages = createCache({ ttl: 300, maxEntries: 50 });

function render(path) {
  let html = pages.get(path);
  if (!html) {
    html = '<h1>' + path + '</h1>';
    pages.set(path, html);
  }
  return html;
}

module.exports = { render };
EOF
c "docs: page cache example"

cat > docs/usage.md <<'EOF'
# Usage

```js
const { createCache } = require('shelf');
const cache = createCache({ ttl: 120 });
```

`ttl` is given in seconds. An entry older than `ttl` seconds is treated as
missing and removed on the next `get`.

Sessions use a fixed 30 minute lifetime; see `src/session.js`.

From the command line:

    shelf --ttl 30 --print-config

`--ttl` takes seconds.
EOF
cat > docs/config.md <<'EOF'
# Configuration

| Key          | Where                         | Unit    | Default |
| ------------ | ----------------------------- | ------- | ------- |
| `ttl`        | `config/default.json`         | seconds | 60      |
| `maxEntries` | `config/default.json`         | entries | 100     |
| `SHELF_TTL`  | environment variable          | seconds | unset   |

Order of precedence: file, environment, explicit overrides.
EOF
c "docs: usage and configuration"

for spec in \
 "pad|left|(s, n) => String(s).padStart(n, '0')|left(7, 3)|007" \
 "bytes|kb|(n) => Math.round(n / 1024)|kb(2048)|2" \
 "names|initials|(s) => s.split(' ').map((w) => w[0]).join('')|initials('Ada Lovelace')|AL" ; do
  IFS='|' read -r f fn ex call exp <<<"$spec"
  case "$exp" in 2) e=2;; *) e="'$exp'";; esac
  util "$f" "$fn" "$ex" "$call" "$e"
done

cat > .gitignore <<'EOF'
node_modules
EOF
c "chore: gitignore"
