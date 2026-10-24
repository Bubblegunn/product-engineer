#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Tomas Berg"
git config user.email "tomas@gatelib.example"
N=0
commit() {
  N=$((N+1))
  local d
  d=$(printf '2026-06-%02dT%02d:00:00Z' $((1+N/8)) $((9+N%8)))
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}
mkdir -p src/util test

cat > package.json <<'EOF'
{
  "name": "gate-lib",
  "version": "0.3.0",
  "main": "src/index.js",
  "scripts": { "test": "node --test" }
}
EOF
printf 'node_modules/\n' > .gitignore
printf '# gate-lib\n\nSmall rate limiting helpers.\n' > README.md
git add -A; commit "chore: skeleton"

for i in 1 2 3 4 5 6 7; do
  cat > "src/util/mod$i.js" <<EOF
'use strict';
module.exports = function mod$i(n) {
  return n * $i;
};
EOF
  cat > "test/mod$i.test.js" <<EOF
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const mod = require('../src/util/mod$i');

test('mod$i multiplies by $i', () => {
  assert.strictEqual(mod(4), $((4 * i)));
});
EOF
  git add -A; commit "feat(util): add mod$i"
done

cat > src/limiter.js <<'EOF'
'use strict';
class Limiter {
  constructor(max, windowMs) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = [];
  }
  take(now) {
    this.hits = this.hits.filter((t) => now - t < this.windowMs);
    if (this.hits.length >= this.max) return false;
    this.hits.push(now);
    return true;
  }
}
function createLimiter(max, windowMs) {
  return new Limiter(max, windowMs);
}
module.exports = { Limiter, createLimiter };
EOF
cat > test/limiter.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createLimiter } = require('../src/limiter');

test('allows up to max inside the window', () => {
  const l = createLimiter(2, 1000);
  assert.ok(l.take(0));
  assert.ok(l.take(10));
  assert.ok(!l.take(20));
});
test('window slides', () => {
  const l = createLimiter(1, 1000);
  assert.ok(l.take(0));
  assert.ok(l.take(1500));
});
EOF
git add -A; commit "feat: sliding window limiter"

cat > src/legacy-retry.js <<'EOF'
'use strict';
// Deprecated: kept for callers on the 0.2 API.
function retry(fn, times) {
  let last;
  for (let i = 0; i < times; i++) {
    try { return fn(); } catch (e) { last = e; }
  }
  throw last;
}
module.exports = { retry };
EOF
cat > test/legacy-retry.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { retry } = require('../src/legacy-retry');

test('retries until success', () => {
  let n = 0;
  assert.strictEqual(retry(() => { if (++n < 3) throw new Error('x'); return n; }, 5), 3);
});
EOF
git add -A; commit "feat: legacy retry helper"

cat > src/index.js <<'EOF'
'use strict';
const limiter = require('./limiter');
const { retry } = require('./legacy-retry');

module.exports = { Limiter: limiter.Limiter, createLimiter: limiter.createLimiter, retry };
EOF
cat > test/index.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const api = require('../src/index');

test('public API surface', () => {
  assert.deepStrictEqual(Object.keys(api).sort(), ['Limiter', 'createLimiter', 'retry']);
});
EOF
cat > src/stats.js <<'EOF'
'use strict';
function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
module.exports = { mean };
EOF
cat > test/stats.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { mean } = require('../src/stats');

test('mean', () => {
  assert.strictEqual(mean([2, 4]), 3);
});
EOF
git add -A; commit "feat: public index and stats"

# ---- messy working tree ----
# staged: rename of limiter (+test), deletion of legacy retry (+test)
git mv src/limiter.js src/rate-limit.js
printf '// Sliding window rate limiter (formerly limiter.js).\n' | cat - src/rate-limit.js > src/rate-limit.js.tmp && mv src/rate-limit.js.tmp src/rate-limit.js
git mv test/limiter.test.js test/rate-limit.test.js
sed -i.bak "s#../src/limiter#../src/rate-limit#" test/rate-limit.test.js && rm test/rate-limit.test.js.bak
git add src/rate-limit.js test/rate-limit.test.js
git rm -q src/legacy-retry.js test/legacy-retry.test.js

# unstaged: index.js and index.test.js follow the rename and the removal
cat > src/index.js <<'EOF'
'use strict';
const limiter = require('./rate-limit');

module.exports = { Limiter: limiter.Limiter, createLimiter: limiter.createLimiter };
EOF
sed -i.bak "s/\['Limiter', 'createLimiter', 'retry'\]/['Limiter', 'createLimiter']/" test/index.test.js && rm test/index.test.js.bak
# unstaged, unrelated
printf '\nSee also: stats helpers (coming soon).\n' >> README.md
cat >> src/stats.js <<'EOF'

// WIP: median, not finished
function median(xs) {
  return xs[Math.floor(xs.length / 2)]; // TODO sort first
}
module.exports.median = median;
EOF
# untracked
printf 'console.log(require("./src/index"));\n' > scratch.js
mkdir -p coverage
printf 'TN:\nend_of_record\n' > coverage/lcov.info
