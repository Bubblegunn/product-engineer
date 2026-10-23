#!/bin/bash
# X100: stayhub. Nine commits after tag v1.4.0: a dependency bump that also raises the required Node version (in
# package.json engines), a docs commit reverted by a "revert: docs" commit, a JSON export feature, a real rounding
# fix for nightly totals, a version bump, and filler.
# Usage: fixture.sh <empty directory>. Offline, Node only, fixed dates.
set -euo pipefail
if [ $# -ne 1 ] || [ ! -d "$1" ] || [ -n "$(ls -A "$1")" ]; then
  echo "usage: fixture.sh <empty directory>" >&2
  exit 2
fi
cd "$1"
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME=Dev GIT_AUTHOR_EMAIL=dev@example.com GIT_COMMITTER_NAME=Dev GIT_COMMITTER_EMAIL=dev@example.com
git init -q -b main
git config user.name Dev
git config user.email dev@example.com
DAY=14
STAMP=

# next_stamp: sets STAMP to the next fixed date, one per commit (no subshell, so DAY persists).
next_stamp() {
  DAY=$((DAY + 1))
  STAMP=$(printf '2026-10-%02dT10:00:00+00:00' "$DAY")
}
# commit_on <subject>: commits what is staged with the next fixed date.
commit_on() {
  next_stamp
  GIT_AUTHOR_DATE="$STAMP" GIT_COMMITTER_DATE="$STAMP" git commit -q -m "$1"
}

mkdir -p src test
cat > package.json <<'EOF'
{ "name": "stayhub", "version": "1.4.0", "private": true, "engines": { "node": ">=18" }, "dependencies": { "csv-lib": "1.2.0" }, "scripts": { "test": "node --test" } }
EOF
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.

## Setup

Run `npm test` to chek the code.
EOF
cat > src/pricing.js <<'EOF'
// Total for a stay: nights times the nightly rate.
function quote(nights, rate) {
  return nights * rate;
}

module.exports = { quote };
EOF
cat > test/pricing.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { quote } = require('../src/pricing');

test('a stay totals nights times the rate', () => {
  assert.equal(quote(2, 120), 240);
});
EOF
cat > src/export.js <<'EOF'
function toCsv(bookings) {
  return ['id,guest,checkIn'].concat(bookings.map((b) => `${b.id},${b.guest},${b.checkIn}`)).join('\n');
}

module.exports = { toCsv };
EOF
cat > test/export.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toCsv } = require('../src/export');

test('an empty list exports the header only', () => {
  assert.equal(toCsv([]), 'id,guest,checkIn');
});
EOF
git add package.json README.md src/pricing.js test/pricing.test.js src/export.js test/export.test.js
GIT_AUTHOR_DATE="2026-10-14T10:00:00+00:00" GIT_COMMITTER_DATE="2026-10-14T10:00:00+00:00" git commit -q -m "chore: initial stayhub pricing and export"
git tag v1.4.0

# 1. Titled "deps", but the diff also raises the required Node version from 18 to 20.
cat > package.json <<'EOF'
{ "name": "stayhub", "version": "1.4.0", "private": true, "engines": { "node": ">=20" }, "dependencies": { "csv-lib": "1.3.0" }, "scripts": { "test": "node --test" } }
EOF
git add package.json
commit_on "chore(deps): bump csv-lib"

# 2. A docs commit that adds a totals section.
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.

## Totals

Totals are shown to the owner for each booking.

## Setup

Run `npm test` to chek the code.
EOF
git add README.md
commit_on "docs: explain totals in README"

# 3. Revert of commit 2.
git revert --no-commit HEAD
commit_on "revert: docs"

# 4. Feature: JSON export.
cat > src/export.js <<'EOF'
function toCsv(bookings) {
  return ['id,guest,checkIn'].concat(bookings.map((b) => `${b.id},${b.guest},${b.checkIn}`)).join('\n');
}

function toJson(bookings) {
  return JSON.stringify(bookings.map((b) => ({ id: b.id, guest: b.guest, checkIn: b.checkIn })), null, 2);
}

module.exports = { toCsv, toJson };
EOF
cat > test/export.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toCsv, toJson } = require('../src/export');

test('an empty list exports the header only', () => {
  assert.equal(toCsv([]), 'id,guest,checkIn');
});

test('the JSON export keeps the id, guest and check-in fields', () => {
  const rows = JSON.parse(toJson([{ id: 1, guest: 'Ana', checkIn: '2026-10-21', internal: true }]));
  assert.deepEqual(rows, [{ id: 1, guest: 'Ana', checkIn: '2026-10-21' }]);
});
EOF
git add src/export.js test/export.test.js
commit_on "feat(export): add JSON export"

# 5. Fix: nightly totals were not rounded, so 0.1 times 3 showed as 0.30000000000000004.
cat > src/pricing.js <<'EOF'
// Total for a stay: nights times the nightly rate, rounded to 2 decimals.
function quote(nights, rate) {
  return Math.round(nights * rate * 100) / 100;
}

module.exports = { quote };
EOF
cat > test/pricing.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { quote } = require('../src/pricing');

test('a stay totals nights times the rate', () => {
  assert.equal(quote(2, 120), 240);
});

test('a total is rounded to 2 decimals', () => {
  assert.equal(quote(3, 0.1), 0.3);
});
EOF
git add src/pricing.js test/pricing.test.js
commit_on "fix: rounding of nightly totals to 2 decimals"

# 6. Version bump.
cat > package.json <<'EOF'
{ "name": "stayhub", "version": "1.6.0", "private": true, "engines": { "node": ">=20" }, "dependencies": { "csv-lib": "1.3.0" }, "scripts": { "test": "node --test" } }
EOF
git add package.json
commit_on "chore: bump version to 1.6.0"

# 7. Test only.
cat > test/pricing.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { quote } = require('../src/pricing');

test('a stay totals nights times the rate', () => {
  assert.equal(quote(2, 120), 240);
});

test('a total is rounded to 2 decimals', () => {
  assert.equal(quote(3, 0.1), 0.3);
});

test('a zero-night stay totals zero', () => {
  assert.equal(quote(0, 120), 0);
});
EOF
git add test/pricing.test.js
commit_on "test(pricing): cover a zero-night stay"

# 8. Whitespace only.
cat > src/export.js <<'EOF'
function toCsv(bookings) {
  return ['id,guest,checkIn']
    .concat(bookings.map((b) => `${b.id},${b.guest},${b.checkIn}`))
    .join('\n');
}

function toJson(bookings) {
  return JSON.stringify(bookings.map((b) => ({ id: b.id, guest: b.guest, checkIn: b.checkIn })), null, 2);
}

module.exports = { toCsv, toJson };
EOF
git add src/export.js
commit_on "style: reformat export module"

# 9. Typo fix in the README.
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.

## Setup

Run `npm test` to check the code.
EOF
git add README.md
commit_on "docs: fix typo in README"
