#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev Owner"
git config user.email "owner@example.com"
ci() { GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"; }

export GIT_AUTHOR_DATE="2026-08-01T10:00:00" GIT_COMMITTER_DATE="2026-08-01T10:00:00"
mkdir -p src test
cat > package.json <<'EOF'
{"name":"fetchkit","version":"1.2.0","scripts":{"test":"node --test"}}
EOF
cat > src/config.js <<'EOF'
module.exports = { timeoutMs: 30000, maxItems: 100 };
EOF
cat > src/index.js <<'EOF'
const config = require('./config');
function fetchAll(client, opts = {}) {
  const max = opts.maxItems ?? config.maxItems;
  return client.list().slice(0, max);
}
module.exports = { fetchAll };
EOF
cat > test/index.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { fetchAll } = require('../src/index');
const client = { list: () => [1, 2, 3, 4] };
test('maxItems limits results', () => { assert.strictEqual(fetchAll(client, { maxItems: 2 }).length, 2); });
test('default returns all small lists', () => { assert.strictEqual(fetchAll(client).length, 4); });
EOF
git add -A; ci "2026-08-01T10:00:00" "release 1.2.0"
git tag v1.2.0
echo "exports.toCsv = (rows) => rows.map((r) => r.join(',')).join('\n');" > src/csv.js
git add -A; ci "2026-08-05T10:00:00" "feat: add CSV export for reports"
export GIT_AUTHOR_DATE="2026-08-06T10:00:00" GIT_COMMITTER_DATE="2026-08-06T10:00:00"
git revert --no-edit HEAD >/dev/null
echo 'module.exports = { timeoutMs: 45000, maxItems: 100 };' > src/config.js
git add -A; ci "2026-08-07T10:00:00" "fix: increase default timeout to 60s"
cat > src/config.js <<'EOF'
module.exports = { timeoutMs: 45000, maxItems: 100, retries: 2 };
EOF
cat > src/index.js <<'EOF'
const config = require('./config');
function fetchAll(client, opts = {}) {
  const max = opts.maxItems ?? config.maxItems;
  return client.list().slice(0, max);
}
function withRetry(fn, retries = config.retries) {
  let last;
  for (let i = 0; i <= retries; i++) {
    try { return fn(); } catch (e) { last = e; }
  }
  throw last;
}
module.exports = { fetchAll, withRetry };
EOF
git add -A; ci "2026-08-10T10:00:00" "feat: retry failed requests"
cat > src/config.js <<'EOF'
module.exports = { timeoutMs: 45000, limit: 100, retries: 2 };
EOF
sed -i.bak 's/maxItems/limit/g' src/index.js test/index.test.js && rm src/index.js.bak test/index.test.js.bak
git add -A; ci "2026-08-12T10:00:00" "chore: tidy option names"
echo "# fetchkit
Fetch helpers. Supports CSV export of reports." > README.md
git add -A; ci "2026-08-14T10:00:00" "docs: update README"
git tag v1.3.0
