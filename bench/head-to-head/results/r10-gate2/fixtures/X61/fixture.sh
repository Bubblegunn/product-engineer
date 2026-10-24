#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Mira Okafor"
git config user.email "mira@pacer.test"
N=0
c() { # who(a|b) message
  N=$((N+1)); local d=$((1767225600 + N*172800)) nm em
  if [ "$1" = a ]; then nm="Mira Okafor"; em="mira@pacer.test"; else nm="Jonas Weber"; em="jonas@pacer.test"; fi
  git add -A
  GIT_AUTHOR_NAME="$nm" GIT_AUTHOR_EMAIL="$em" GIT_COMMITTER_NAME="$nm" GIT_COMMITTER_EMAIL="$em" \
  GIT_AUTHOR_DATE="@$d +0000" GIT_COMMITTER_DATE="@$d +0000" git commit -q -m "$2"
}
fl() { # who message ; filler change chosen by message prefix
  local m="$2"
  case "$m" in
    docs*) echo "- $m" >> docs/notes.md ;;
    test*) printf "const t = require('node:test');\nconst a = require('node:assert');\nt('%s', () => a.ok(true));\n" "case $((N+1))" > "test/extra$((N+1)).test.js" ;;
    *) echo "// $m" >> src/clock.js ;;
  esac
  c "$1" "$m"
}
mkdir -p src test docs examples

# ---------------- phase 1: up to 1.4.0 ----------------
cat > package.json <<'EOF'
{
  "name": "pacer",
  "version": "1.3.0",
  "description": "Small rate limiter for Node services",
  "main": "src/index.js",
  "scripts": { "test": "node --test" },
  "license": "MIT"
}
EOF
printf 'node_modules\n*.tmp\n' > .gitignore
printf 'MIT License\n\nCopyright (c) 2026 Pacer authors\n' > LICENSE
printf '# pacer\n\nRate limiting for Node services.\n' > README.md
printf '# Notes\n\n' > docs/notes.md
c a "chore: project skeleton"

cat > src/clock.js <<'EOF'
'use strict';
let fixed = null;
module.exports = {
  now: () => (fixed === null ? Date.now() : fixed),
  set(v) { fixed = v; },
  reset() { fixed = null; },
};
EOF
cat > src/options.js <<'EOF'
'use strict';
const DEFAULTS = {
  limit: 100,
  windowMs: 1000,
  retries: 3,
};
function resolve(o = {}) {
  return { ...DEFAULTS, ...o };
}
module.exports = { DEFAULTS, resolve };
EOF
cat > src/errors.js <<'EOF'
'use strict';
class RateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateError';
    this.code = 'E_RATE';
  }
}
module.exports = { RateError };
EOF
cat > src/bucket.js <<'EOF'
'use strict';
const { resolve } = require('./options');
const clock = require('./clock');

class Bucket {
  constructor(opts) {
    this.o = resolve(opts);
    this.count = 0;
    this.start = clock.now();
  }
  take() {
    const now = clock.now();
    if (now - this.start >= this.o.windowMs) {
      this.start = now;
      this.count = 0;
    }
    if (this.count >= this.o.limit - 1) return false;
    this.count++;
    return true;
  }
}
module.exports = { Bucket };
EOF
cat > src/index.js <<'EOF'
'use strict';
const { Bucket } = require('./bucket');
const { RateError } = require('./errors');
module.exports = { create: (o) => new Bucket(o), Bucket, RateError };
EOF
cat > test/bucket.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { create } = require('../src');
const clock = require('../src/clock');

test('allows limit-1 requests per window', () => {
  clock.set(0);
  const b = create({ limit: 3 });
  assert.ok(b.take());
  assert.ok(b.take());
  assert.equal(b.take(), false);
  clock.reset();
});

test('window rolls over', () => {
  clock.set(0);
  const b = create({ limit: 2, windowMs: 100 });
  assert.ok(b.take());
  assert.equal(b.take(), false);
  clock.set(150);
  assert.ok(b.take());
  clock.reset();
});
EOF
cat > test/errors.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { RateError } = require('../src');

test('error has code E_RATE', () => {
  const e = new RateError('slow down');
  assert.equal(e.code, 'E_RATE');
  assert.equal(e.name, 'RateError');
});
EOF
c a "feat: fixed-window bucket"

cat > src/store-memory.js <<'EOF'
'use strict';
class MemoryStore {
  constructor() { this.m = new Map(); }
  save(k, v) { this.m.set(k, v); }
  load(k) { return this.m.has(k) ? this.m.get(k) : null; }
}
module.exports = { MemoryStore };
EOF
c b "feat: memory store"

cat > docs/options.md <<'EOF'
# Options

| Option | Default | Meaning |
| --- | --- | --- |
| `limit` | 100 | requests per window |
| `windowMs` | 1000 | window length in milliseconds |
| `retries` | 3 | how many times `take()` callers are advised to retry |
EOF
c a "docs: options reference"

cat > src/store-file.js <<'EOF'
'use strict';
const fs = require('fs');
class FileStore {
  constructor(path, o = {}) { this.path = path; this.o = o; }
  save(state) {
    fs.writeFileSync(this.path, JSON.stringify(state));
  }
  load() {
    try { return JSON.parse(fs.readFileSync(this.path, 'utf8')); } catch (e) { return null; }
  }
}
module.exports = { FileStore };
EOF
cat > test/store.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');
const { FileStore } = require('../src/store-file');

test('file store round trip', () => {
  const s = new FileStore(path.join(os.tmpdir(), 'pacer-store-test.json'));
  s.save({ a: 1 });
  assert.deepEqual(s.load(), { a: 1 });
});
EOF
cat > docs/stores.md <<'EOF'
# Stores

- `MemoryStore`: in-process map, lost on restart.
- `FileStore(path)`: writes counter state to a JSON file.
EOF
c b "feat: file store"
fl b "chore: tidy clock module"
cat > examples/basic.js <<'EOF'
const { create } = require('../src');
const b = create({ limit: 5, windowMs: 1000 });
for (let i = 0; i < 6; i++) console.log(i, b.take());
EOF
c a "docs: add basic example"
cat > README.md <<'EOF'
# pacer

Rate limiting for Node services.

```js
const { create } = require('pacer');
const bucket = create({ limit: 10, windowMs: 1000 });
if (!bucket.take()) throw new Error('rate limited');
```

Options: `limit`, `windowMs`, `retries` (see docs/options.md).
Stores: `MemoryStore`, `FileStore` (see docs/stores.md).
EOF
c b "docs: README usage"
fl a "docs: wording in notes"
cat > CHANGELOG.md <<'EOF'
# Changelog

## 1.4.0 - 2026-02-12

### Added
- `FileStore` persists counters to a JSON file.
- `MemoryStore` for tests and single-process services.

### Changed
- Documentation now has an options reference (`docs/options.md`).

## 1.3.0 - 2026-01-20

### Added
- First public fixed-window bucket (`create`, `take`).
EOF
sed -i.bak 's/"version": "1.3.0"/"version": "1.4.0"/' package.json && rm package.json.bak
c a "chore: release 1.4.0"
git tag v1.4.0

# ---------------- phase 2: after 1.4.0 ----------------
# P1 understated breaking rename
sed -i.bak 's/retries: 3,/maxRetries: 3,/' src/options.js && rm src/options.js.bak
sed -i.bak 's/`retries` | 3/`maxRetries` | 3/' docs/options.md && rm docs/options.md.bak
sed -i.bak 's/`retries` (see/`maxRetries` (see/' README.md && rm README.md.bak
c a "chore: tidy options"
fl b "docs: fix typos in notes"
fl b "chore: normalize comments"
# burst
sed -i.bak 's/  windowMs: 1000,/  windowMs: 1000,\n  burst: 0,/' src/options.js && rm src/options.js.bak
sed -i.bak 's/this.o.limit - 1)/this.o.limit - 1 + this.o.burst)/' src/bucket.js && rm src/bucket.js.bak
printf '| `burst` | 0 | extra requests allowed on top of `limit` in one window |\n' >> docs/options.md
c a "feat: add burst option"
fl b "docs: clarify window wording"
# compress (will be reverted)
cat > src/store-file.js <<'EOF'
'use strict';
const fs = require('fs');
const zlib = require('zlib');
class FileStore {
  constructor(path, o = {}) { this.path = path; this.o = o; }
  save(state) {
    const j = JSON.stringify(state);
    fs.writeFileSync(this.path, this.o.compress ? zlib.gzipSync(j) : j);
  }
  load() {
    try {
      const raw = fs.readFileSync(this.path);
      return JSON.parse((this.o.compress ? zlib.gunzipSync(raw) : raw).toString('utf8'));
    } catch (e) { return null; }
  }
}
module.exports = { FileStore };
EOF
c b "feat: gzip-compress persisted state"
COMPRESS=$(git rev-parse HEAD)
printf -- '- `FileStore(path, { compress: true })`: gzip the state file to save disk space.\n' >> docs/stores.md
printf '\nPersisted state can be gzip-compressed with `new FileStore(path, { compress: true })`.\n' >> README.md
c b "docs: describe compress option"
fl a "test: extra window rollover case"
# sliding window, buggy first version
cat > src/sliding.js <<'EOF'
'use strict';
const clock = require('./clock');
class Sliding {
  constructor(o) { this.o = o; this.hits = []; }
  take() {
    const now = clock.now();
    this.hits = this.hits.filter((t) => now - t > this.o.windowMs);
    if (this.hits.length >= this.o.limit + this.o.burst) return false;
    this.hits.push(now);
    return true;
  }
}
module.exports = { Sliding };
EOF
cat > src/index.js <<'EOF'
'use strict';
const { Bucket } = require('./bucket');
const { Sliding } = require('./sliding');
const { resolve } = require('./options');
const { RateError } = require('./errors');
module.exports = {
  create: (o) => (resolve(o).algorithm === 'sliding' ? new Sliding(resolve(o)) : new Bucket(o)),
  Bucket,
  Sliding,
  RateError,
};
EOF
sed -i.bak 's/  burst: 0,/  burst: 0,\n  algorithm: '"'"'fixed'"'"',/' src/options.js && rm src/options.js.bak
c b "feat: sliding window algorithm"
SLIDING=$(git rev-parse HEAD)
fl a "docs: link examples"
git revert --no-commit "$SLIDING"
c a 'Revert "feat: sliding window algorithm"'
git revert --no-commit "$COMPRESS"
c b 'Revert "feat: gzip-compress persisted state"'
fl a "chore: remove unused variable"
# understated breaking error rename
cat > src/errors.js <<'EOF'
'use strict';
class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
    this.code = 'ERR_RATE_LIMIT';
  }
}
module.exports = { RateLimitError };
EOF
sed -i.bak 's/RateError/RateLimitError/g' src/index.js && rm src/index.js.bak
cat > test/errors.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { RateLimitError } = require('../src');

test('error has code ERR_RATE_LIMIT', () => {
  const e = new RateLimitError('slow down');
  assert.equal(e.code, 'ERR_RATE_LIMIT');
  assert.equal(e.name, 'RateLimitError');
});
EOF
c a "refactor: errors"
fl b "docs: tidy notes"
# off-by-one fix + burst test
sed -i.bak 's/this.o.limit - 1 + this.o.burst)/this.o.limit + this.o.burst)/' src/bucket.js && rm src/bucket.js.bak
cat > test/bucket.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { create } = require('../src');
const clock = require('../src/clock');

test('allows exactly limit requests per window', () => {
  clock.set(0);
  const b = create({ limit: 3 });
  assert.ok(b.take());
  assert.ok(b.take());
  assert.ok(b.take());
  assert.equal(b.take(), false);
  clock.reset();
});

test('burst adds capacity', () => {
  clock.set(0);
  const b = create({ limit: 1, burst: 2 });
  assert.ok(b.take());
  assert.ok(b.take());
  assert.ok(b.take());
  assert.equal(b.take(), false);
  clock.reset();
});

test('window rolls over', () => {
  clock.set(0);
  const b = create({ limit: 1, windowMs: 100 });
  assert.ok(b.take());
  assert.equal(b.take(), false);
  clock.set(150);
  assert.ok(b.take());
  clock.reset();
});
EOF
c b "fix: allow exactly limit requests per window"
fl a "test: extra store case"
# reapply sliding with fix
cat > src/sliding.js <<'EOF'
'use strict';
const clock = require('./clock');
class Sliding {
  constructor(o) { this.o = o; this.hits = []; }
  take() {
    const now = clock.now();
    this.hits = this.hits.filter((t) => now - t < this.o.windowMs);
    if (this.hits.length >= this.o.limit + this.o.burst) return false;
    this.hits.push(now);
    return true;
  }
}
module.exports = { Sliding };
EOF
cat > src/index.js <<'EOF'
'use strict';
const { Bucket } = require('./bucket');
const { Sliding } = require('./sliding');
const { resolve } = require('./options');
const { RateLimitError } = require('./errors');
module.exports = {
  create: (o) => (resolve(o).algorithm === 'sliding' ? new Sliding(resolve(o)) : new Bucket(o)),
  Bucket,
  Sliding,
  RateLimitError,
};
EOF
sed -i.bak 's/  burst: 0,/  burst: 0,\n  algorithm: '"'"'fixed'"'"',/' src/options.js && rm src/options.js.bak
cat > test/sliding.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { create } = require('../src');
const clock = require('../src/clock');

test('sliding window forgets old hits', () => {
  clock.set(0);
  const b = create({ limit: 2, windowMs: 100, algorithm: 'sliding' });
  assert.ok(b.take());
  assert.ok(b.take());
  assert.equal(b.take(), false);
  clock.set(120);
  assert.ok(b.take());
  clock.reset();
});
EOF
c b 'Reapply "feat: sliding window algorithm"'
printf '| `algorithm` | `fixed` | `fixed` or `sliding` window counting |\n' >> docs/options.md
c a "docs: document sliding window"
fl b "chore: comment cleanup"
fl a "docs: notes for 2.0 planning"
sed -i.bak 's/"version": "1.4.0"/"version": "2.0.0"/' package.json && rm package.json.bak
c a "chore: bump version to 2.0.0"
fl b "docs: fix typo in notes"

# unmerged branch
git branch feature/streaming-export "$(git rev-parse HEAD~6)"
git checkout -q feature/streaming-export
cat > src/export.js <<'EOF'
'use strict';
function exportStream(store) { return { pipe: () => store }; }
module.exports = { exportStream };
EOF
c b "feat: streaming export of counter state"
echo "// TODO backpressure" >> src/export.js
c b "wip: streaming export backpressure"
printf '\nStreaming export: `exportStream(store)` (experimental).\n' >> README.md
c b "docs: streaming export draft"
git checkout -q main
