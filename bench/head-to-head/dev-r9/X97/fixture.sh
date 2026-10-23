#!/bin/bash
# X97: stayhub. Twelve commits after tag v1.4.0: a "tidy" commit that halves the bookings page size, a CSV
# formula fix, a comma fix, a search feature, tests, docs, a whitespace-only reformat and a dead-code removal.
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
{ "name": "stayhub", "version": "1.4.0", "private": true, "scripts": { "test": "node --test" } }
EOF
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.
EOF
cat > src/list.js <<'EOF'
const PAGE_SIZE = 50;

// Returns one page of bookings; pages start at 1.
function paginate(items, page = 1) {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function pageCount(total) {
  return Math.ceil(total / PAGE_SIZE);
}

module.exports = { paginate, PAGE_SIZE };
EOF
cat > test/list.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { paginate, PAGE_SIZE } = require('../src/list');

test('a full page holds PAGE_SIZE bookings', () => {
  const items = Array.from({ length: 120 }, (_, i) => i);
  assert.equal(paginate(items, 1).length, PAGE_SIZE);
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
cat > src/pricing.js <<'EOF'
const NIGHTLY_RATE_EUR = 120;

function quote(nights) {
  return nights * NIGHTLY_RATE_EUR;
}

module.exports = { quote, NIGHTLY_RATE_EUR };
EOF
cat > test/pricing.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { quote, NIGHTLY_RATE_EUR } = require('../src/pricing');

test('a stay costs the nightly rate for each night', () => {
  assert.equal(quote(2), 2 * NIGHTLY_RATE_EUR);
});
EOF
git add package.json README.md src/list.js test/list.test.js src/export.js test/export.test.js src/pricing.js test/pricing.test.js
GIT_AUTHOR_DATE="2026-10-14T10:00:00+00:00" GIT_COMMITTER_DATE="2026-10-14T10:00:00+00:00" git commit -q -m "chore: initial stayhub list, export and pricing"
git tag v1.4.0

# 1. Titled "tidy", but the page size is halved from 50 to 25.
cat > src/list.js <<'EOF'
const PAGE_SIZE = 25;

// Returns one page of bookings; pages start at 1.
function paginate(items, page = 1) {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function pageCount(total) {
  return Math.ceil(total / PAGE_SIZE);
}

module.exports = { paginate, PAGE_SIZE };
EOF
git add src/list.js
commit_on "chore: tidy the bookings list module"

# 2. Tests only.
cat > test/list.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { paginate, PAGE_SIZE } = require('../src/list');

test('a full page holds PAGE_SIZE bookings', () => {
  const items = Array.from({ length: 120 }, (_, i) => i);
  assert.equal(paginate(items, 1).length, PAGE_SIZE);
});

test('an empty list gives an empty page', () => {
  assert.deepEqual(paginate([], 1), []);
});
EOF
git add test/list.test.js
commit_on "test: cover empty list"

# 3. Real docs.
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.

## Export

Use the Export buton to download the bookings as a CSV file.
EOF
git add README.md
commit_on "docs: update README"

# 4. Security fix: a guest name that starts with a formula character is neutralised in the export.
cat > src/export.js <<'EOF'
function neutralise(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function toCsv(bookings) {
  const rows = bookings.map((b) => [b.id, neutralise(b.guest), b.checkIn].join(','));
  return ['id,guest,checkIn'].concat(rows).join('\n');
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

test('a guest name that starts with a formula character is neutralised', () => {
  assert.equal(toCsv([{ id: 1, guest: '=1+1', checkIn: '2026-10-21' }]), "id,guest,checkIn\n1,'=1+1,2026-10-21");
});
EOF
git add src/export.js test/export.test.js
commit_on "fix(security): neutralise spreadsheet formulas in CSV export"

# 5. Whitespace only.
cat > src/pricing.js <<'EOF'
const NIGHTLY_RATE_EUR = 120;

function quote(nights) {
    return nights * NIGHTLY_RATE_EUR;
}

module.exports = { quote, NIGHTLY_RATE_EUR };
EOF
git add src/pricing.js
commit_on "style: reformat pricing"

# 6. The feature.
cat > src/search.js <<'EOF'
// Bookings whose guest name contains the query, ignoring case.
function searchByGuest(bookings, query) {
  const needle = query.toLowerCase();
  return bookings.filter((b) => b.guest.toLowerCase().includes(needle));
}

module.exports = { searchByGuest };
EOF
cat > test/search.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { searchByGuest } = require('../src/search');

test('a search finds bookings by part of the guest name', () => {
  const bookings = [
    { id: 1, guest: 'Ana Silva' },
    { id: 2, guest: 'Mehmet Yilmaz' },
  ];
  assert.deepEqual(searchByGuest(bookings, 'Silva').map((b) => b.id), [1]);
});
EOF
git add src/search.js test/search.test.js
commit_on "feat(search): search bookings by guest name"

# 7. A guest name with a comma is quoted, so it stays in one CSV column.
cat > src/export.js <<'EOF'
function neutralise(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function quoteField(text) {
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(bookings) {
  const rows = bookings.map((b) => [b.id, quoteField(neutralise(b.guest)), b.checkIn].join(','));
  return ['id,guest,checkIn'].concat(rows).join('\n');
}

module.exports = { toCsv };
EOF
git add src/export.js
commit_on "fix(export): quote guest names that contain commas"

# 8. Tests only.
cat > test/search.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { searchByGuest } = require('../src/search');

const bookings = [
  { id: 1, guest: 'Ana Silva' },
  { id: 2, guest: 'Mehmet Yilmaz' },
];

test('a search finds bookings by part of the guest name', () => {
  assert.deepEqual(searchByGuest(bookings, 'Silva').map((b) => b.id), [1]);
});

test('a search ignores case', () => {
  assert.deepEqual(searchByGuest(bookings, 'silva').map((b) => b.id), [1]);
});
EOF
git add test/search.test.js
commit_on "test(search): match names regardless of case"

# 9. Dead code removed; no behaviour change.
cat > src/list.js <<'EOF'
const PAGE_SIZE = 25;

// Returns one page of bookings; pages start at 1.
function paginate(items, page = 1) {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

module.exports = { paginate, PAGE_SIZE };
EOF
git add src/list.js
commit_on "chore: remove unused helper in list"

# 10. Fixes the typo from the README commit.
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.

## Export

Use the Export button to download the bookings as a CSV file.
EOF
git add README.md
commit_on "docs: fix typo in README"

# 11. Whitespace and line breaks only.
cat > src/search.js <<'EOF'
// Bookings whose guest name contains the query, ignoring case.
function searchByGuest(bookings, query) {
  const needle = query.toLowerCase();
  return bookings.filter((b) =>
    b.guest.toLowerCase().includes(needle),
  );
}

module.exports = { searchByGuest };
EOF
git add src/search.js
commit_on "style: reformat search module"

# 12. Test for the comma fix.
cat > test/export.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toCsv } = require('../src/export');

test('an empty list exports the header only', () => {
  assert.equal(toCsv([]), 'id,guest,checkIn');
});

test('a guest name that starts with a formula character is neutralised', () => {
  assert.equal(toCsv([{ id: 1, guest: '=1+1', checkIn: '2026-10-21' }]), "id,guest,checkIn\n1,'=1+1,2026-10-21");
});

test('a guest name with a comma is quoted', () => {
  assert.equal(toCsv([{ id: 3, guest: 'Smith, Ana', checkIn: '2026-10-22' }]), 'id,guest,checkIn\n3,"Smith, Ana",2026-10-22');
});
EOF
git add test/export.test.js
commit_on "test(export): cover a guest name with a comma"
