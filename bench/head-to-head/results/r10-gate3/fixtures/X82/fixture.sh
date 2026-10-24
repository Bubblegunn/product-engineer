#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Jonas Weber"
git config user.email "jonas@tally.example"
N=0
commit() {
  N=$((N+1))
  local d
  d=$(printf '2026-04-%02dT%02d:00:00Z' $((1+N/8)) $((9+N%8)))
  GIT_AUTHOR_DATE="$d" GIT_COMMITTER_DATE="$d" git commit -q -m "$1"
}
sedi() { sed -e "$1" "$2" > "$2.tmp" && mv "$2.tmp" "$2"; }
mkdir -p src/commands test

cat > package.json <<'EOF'
{
  "name": "tally-cli",
  "version": "1.3.0",
  "bin": { "tally": "src/cli.js" },
  "scripts": { "test": "node --test" }
}
EOF
cat > package-lock.json <<'EOF'
{
  "name": "tally-cli",
  "version": "1.3.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "tally-cli",
      "version": "1.3.0"
    }
  }
}
EOF
cat > src/version.js <<'EOF'
'use strict';
module.exports = { VERSION: '1.3.0' };
EOF
cat > README.md <<'EOF'
# tally-cli

Count things from the command line.

Current release: 1.3.0
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## Unreleased

## 1.3.0 - 2026-03-20
- Added `tally sum`.
EOF
printf 'node_modules/\n' > .gitignore
cat > src/cli.js <<'EOF'
#!/usr/bin/env node
'use strict';
const { VERSION } = require('./version');
function main(argv) {
  if (argv.includes('--version')) return `tally ${VERSION}`;
  return 'usage: tally <command>';
}
if (require.main === module) console.log(main(process.argv.slice(2)));
module.exports = { main };
EOF
cat > test/cli.test.js <<'EOF'
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { main } = require('../src/cli');
const { VERSION } = require('../src/version');

test('--version prints the version constant', () => {
  assert.strictEqual(main(['--version']), `tally ${VERSION}`);
});
EOF
cat > test/release.test.js <<'EOF'
'use strict';
// Every place that states the version must agree.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));

test('lockfile top-level version matches package.json', () => {
  assert.strictEqual(lock.version, pkg.version);
});
test('lockfile root package version matches package.json', () => {
  assert.strictEqual(lock.packages[''].version, pkg.version);
});
test('src/version.js matches package.json', () => {
  assert.strictEqual(require('../src/version').VERSION, pkg.version);
});
test('README names the current release', () => {
  assert.strictEqual(/Current release: (\d+\.\d+\.\d+)/.exec(read('README.md'))[1], pkg.version);
});
test('newest versioned CHANGELOG heading matches package.json', () => {
  assert.strictEqual(/^## (\d+\.\d+\.\d+)/m.exec(read('CHANGELOG.md'))[1], pkg.version);
});
EOF
git add -A; commit "chore: tally-cli 1.3.0 baseline"

for i in 1 2 3 4 5 6 7 8; do
  cat > "src/commands/cmd$i.js" <<EOF
'use strict';
module.exports = function cmd$i(list) {
  return list.length * $i;
};
EOF
  cat > "test/cmd$i.test.js" <<EOF
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const cmd = require('../src/commands/cmd$i');

test('cmd$i multiplies length by $i', () => {
  assert.strictEqual(cmd([1, 2, 3]), $((3 * i)));
});
EOF
  git add -A; commit "feat(commands): add cmd$i"
done

# release 1.4.0 precedent
sedi 's/"version": "1.3.0"/"version": "1.4.0"/' package.json
sedi 's/"version": "1.3.0"/"version": "1.4.0"/' package-lock.json
sedi "s/1.3.0/1.4.0/" src/version.js
sedi "s/1.3.0/1.4.0/" README.md
awk '{print} /^## Unreleased$/{print ""; print "## 1.4.0 - 2026-04-02"; print "- Added commands cmd1 to cmd8."}' CHANGELOG.md > CHANGELOG.tmp && mv CHANGELOG.tmp CHANGELOG.md
git add -A; commit "chore(release): 1.4.0"

# three features after 1.4.0, each noted under Unreleased
add_entry() { awk -v e="- $1" '{print} /^## Unreleased$/{print e}' CHANGELOG.md > CHANGELOG.tmp && mv CHANGELOG.tmp CHANGELOG.md; }
cat > src/export.js <<'EOF'
'use strict';
function toCsv(rows) { return rows.map((r) => r.join(',')).join('\n'); }
module.exports = { toCsv };
EOF
add_entry "Added CSV export (\`toCsv\`)."
git add -A; commit "feat: csv export"
cat > src/group.js <<'EOF'
'use strict';
function groupCount(items) {
  const m = {};
  for (const x of items) m[x] = (m[x] || 0) + 1;
  return m;
}
module.exports = { groupCount };
EOF
add_entry "Added \`groupCount\` helper."
git add -A; commit "feat: group counts"
cat > src/top.js <<'EOF'
'use strict';
function top(counts, n) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
}
module.exports = { top };
EOF
add_entry "Added \`top\` ranking helper."
git add -A; commit "feat: top ranking"

# ---- messy working tree ----
# owner bumped package.json only (unstaged)
sedi 's/"version": "1.4.0"/"version": "1.5.0"/' package.json
# unfinished work in cli.js (unstaged)
cat >> src/cli.js <<'EOF'

// WIP: --quiet flag, not wired up yet
function parseQuiet(argv) {
  return argv.includes('--quiet'); // TODO suppress output
}
module.exports.parseQuiet = parseQuiet;
EOF
# untracked
mkdir -p dist
printf '/* minified build */\nvar tally=1;\n' > dist/tally.min.js
printf '//registry.npmjs.org/:_authToken=npm_REDACTED-FAKE-FIXTURE-VALUE\n' > .npmrc
printf 'release checklist: tag after merge\n' > release-notes-draft.txt
