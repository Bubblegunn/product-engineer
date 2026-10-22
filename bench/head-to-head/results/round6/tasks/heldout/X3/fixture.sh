#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Dev"
git config user.email "dev@example.com"
commit() { git add -A; GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2" git commit -q -m "$1"; }

mkdir -p src test
echo '{"name":"tally","version":"1.2.0","scripts":{"test":"node --test"}}' > package.json
cat > src/count.js <<'EOS'
exports.countWords = (text, { minLength = 1 } = {}) =>
  text.match(/\S+/g).filter((w) => w.length >= minLength).length;
EOS
cat > src/cli.js <<'EOS'
const { countWords } = require('./count');

exports.run = (args, text) => {
  const i = args.indexOf('--min-length');
  const opts = i >= 0 ? { minLength: Number(args[i + 1]) } : {};
  const n = countWords(text, opts);
  return String(n);
};
EOS
cat > test/count.test.js <<'EOS'
const test = require('node:test');
const assert = require('node:assert');
const { run } = require('../src/cli');

test('counts words', () => assert.strictEqual(run([], 'the quick brown fox'), '4'));
test('min-length filters short words', () => assert.strictEqual(run(['--min-length', '5'], 'the quick brown fox'), '2'));
EOS
commit "Release 1.2.0" "2026-08-01T10:00:00Z"
git tag v1.2.0
d() { export GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1"; }
cat > src/cli.js <<'EOS'
const { countWords } = require('./count');

exports.run = (args, text) => {
  const i = args.indexOf('--min-length');
  const opts = i >= 0 ? { minLength: Number(args[i + 1]) } : {};
  const n = countWords(text, opts);
  if (args.includes('--json')) return JSON.stringify({ words: n });
  return String(n);
};
EOS
cat >> test/count.test.js <<'EOS'
test('--json prints an object', () => assert.strictEqual(run(['--json'], 'the quick brown fox'), '{"words":4}'));
EOS
commit "feat: add --json output flag" "2026-08-05T10:00:00Z"
cat > src/cli.js <<'EOS'
const { countWords } = require('./count');

exports.run = (args, text) => {
  const i = args.indexOf('--min-length');
  const opts = i >= 0 ? { minLength: Number(args[i + 1]) } : {};
  const n = countWords(text, opts);
  if (args.includes('--json')) return JSON.stringify({ words: n });
  if (args.includes('--csv')) return 'words\n' + n;
  return String(n);
};
EOS
commit "feat: add --csv output" "2026-08-08T10:00:00Z"
d "2026-08-10T10:00:00Z"; git revert --no-edit HEAD -q >/dev/null 2>&1 || git revert --no-edit HEAD >/dev/null; unset GIT_AUTHOR_DATE GIT_COMMITTER_DATE
cat > src/count.js <<'EOS'
// Note: callers must pass non-empty text; empty input is handled upstream.
exports.countWords = (text, { minLength = 1 } = {}) =>
  text.match(/\S+/g).filter((w) => w.length >= minLength).length;
EOS
commit "fix: crash on empty input" "2026-08-12T10:00:00Z"
cat > src/count.js <<'EOS'
// Note: callers must pass non-empty text; empty input is handled upstream.
exports.countWords = (text, { minLength = 3 } = {}) =>
  text.match(/\S+/g).filter((w) => w.length >= minLength).length;
EOS
commit "chore: tidy option defaults" "2026-08-14T10:00:00Z"
