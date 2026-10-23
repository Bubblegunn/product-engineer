#!/bin/bash
# X99: stayhub. Ten commits after tag v1.4.0: a "perf" commit that only adds a cache (no timing anywhere), a "fix"
# that only adds a debug log line, an occupancy report feature, a real user-visible reminder-time fix, and filler.
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
cat > src/export.js <<'EOF'
function rowFor(b) {
  return `${b.id},${b.guest},${b.checkIn}`;
}

function toCsv(bookings) {
  return ['id,guest,checkIn'].concat(bookings.map(rowFor)).join('\n');
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
cat > src/names.js <<'EOF'
// Trims a guest name for display.
function normaliseName(name) {
  return String(name).trim().replace(/\s+/g, ' ');
}

module.exports = { normaliseName };
EOF
cat > test/names.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normaliseName } = require('../src/names');

test('extra spaces in a guest name are collapsed', () => {
  assert.equal(normaliseName('  Ana   Silva '), 'Ana Silva');
});
EOF
cat > src/reminders.js <<'EOF'
// Reminders go out the day before check-in, at 09:00 UTC.
function sendAt(checkIn) {
  const day = new Date(checkIn);
  day.setUTCDate(day.getUTCDate() - 1);
  day.setUTCHours(9, 0, 0, 0);
  return day;
}

module.exports = { sendAt };
EOF
cat > test/reminders.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendAt } = require('../src/reminders');

test('the reminder goes out at 09:00 UTC the day before check-in', () => {
  assert.equal(sendAt('2026-10-22T12:00:00Z').toISOString(), '2026-10-21T09:00:00.000Z');
});
EOF
git add package.json README.md src/export.js test/export.test.js src/names.js test/names.test.js src/reminders.js test/reminders.test.js
GIT_AUTHOR_DATE="2026-10-14T10:00:00+00:00" GIT_COMMITTER_DATE="2026-10-14T10:00:00+00:00" git commit -q -m "chore: initial stayhub export, names and reminders"
git tag v1.4.0

# 1. Titled "perf", but the diff only adds a cache. No timing is measured or shown anywhere.
cat > src/export.js <<'EOF'
const cache = new Map();

function rowFor(b) {
  return `${b.id},${b.guest},${b.checkIn}`;
}

function toCsv(bookings) {
  const key = JSON.stringify(bookings);
  if (cache.has(key)) return cache.get(key);
  const csv = ['id,guest,checkIn'].concat(bookings.map(rowFor)).join('\n');
  cache.set(key, csv);
  return csv;
}

module.exports = { toCsv };
EOF
git add src/export.js
commit_on "perf: make exports 3x faster"

# 2. Titled "fix", but the diff only adds a debug line that prints when DEBUG_NAMES is set.
cat > src/names.js <<'EOF'
// Trims a guest name for display.
function normaliseName(name) {
  const cleaned = String(name).trim().replace(/\s+/g, ' ');
  if (process.env.DEBUG_NAMES) console.error('name normalised', name, cleaned);
  return cleaned;
}

module.exports = { normaliseName };
EOF
git add src/names.js
commit_on "fix: handle odd names"

# 3. Real feature.
cat > src/reports.js <<'EOF'
// Share of available room-nights that are booked, as a whole percentage.
function occupancyRate(bookedNights, availableNights) {
  if (availableNights === 0) return 0;
  return Math.round((bookedNights / availableNights) * 100);
}

module.exports = { occupancyRate };
EOF
cat > test/reports.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { occupancyRate } = require('../src/reports');

test('half the nights booked is 50 percent occupancy', () => {
  assert.equal(occupancyRate(15, 30), 50);
});
EOF
git add src/reports.js test/reports.test.js
commit_on "feat(reports): add occupancy report"

# 4. Real user-visible fix: the reminder time now follows the hotel's local time.
cat > src/reminders.js <<'EOF'
// Reminders go out at 09:00 on the hotel's local day before check-in.
function sendAt(checkIn, utcOffsetMinutes = 0) {
  const shifted = new Date(new Date(checkIn).getTime() + utcOffsetMinutes * 60000);
  shifted.setUTCDate(shifted.getUTCDate() - 1);
  shifted.setUTCHours(9, 0, 0, 0);
  return new Date(shifted.getTime() - utcOffsetMinutes * 60000);
}

module.exports = { sendAt };
EOF
cat > test/reminders.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendAt } = require('../src/reminders');

test('the reminder goes out at 09:00 UTC the day before check-in', () => {
  assert.equal(sendAt('2026-10-22T12:00:00Z').toISOString(), '2026-10-21T09:00:00.000Z');
});

test('with a UTC+3 hotel the reminder goes out at 09:00 local time', () => {
  assert.equal(sendAt('2026-10-22T12:00:00Z', 180).toISOString(), '2026-10-21T06:00:00.000Z');
});
EOF
git add src/reminders.js test/reminders.test.js
commit_on "fix(reminders): send reminders at 9am local time instead of UTC"

# 5. Tests only.
cat > test/reports.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { occupancyRate } = require('../src/reports');

test('half the nights booked is 50 percent occupancy', () => {
  assert.equal(occupancyRate(15, 30), 50);
});

test('a month with no bookings is 0 percent occupancy', () => {
  assert.equal(occupancyRate(0, 30), 0);
});
EOF
git add test/reports.test.js
commit_on "test(reports): cover a month with no bookings"

# 6. Real docs for the report.
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.

## Reports

The occupancy report shows booked nights as a share of available nights.
EOF
git add README.md
commit_on "docs: describe reports in README"

# 7. Refactor: a helper is renamed.
cat > src/export.js <<'EOF'
const cache = new Map();

function formatRow(b) {
  return `${b.id},${b.guest},${b.checkIn}`;
}

function toCsv(bookings) {
  const key = JSON.stringify(bookings);
  if (cache.has(key)) return cache.get(key);
  const csv = ['id,guest,checkIn'].concat(bookings.map(formatRow)).join('\n');
  cache.set(key, csv);
  return csv;
}

module.exports = { toCsv };
EOF
git add src/export.js
commit_on "refactor(export): rename row helper"

# 8. Comment only.
cat > src/names.js <<'EOF'
// Trims a guest name for display and collapses inner spaces.
function normaliseName(name) {
  const cleaned = String(name).trim().replace(/\s+/g, ' ');
  if (process.env.DEBUG_NAMES) console.error('name normalised', name, cleaned);
  return cleaned;
}

module.exports = { normaliseName };
EOF
git add src/names.js
commit_on "chore: tidy names module"

# 9. Tests only.
cat > test/reminders.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendAt } = require('../src/reminders');

test('the reminder goes out at 09:00 UTC the day before check-in', () => {
  assert.equal(sendAt('2026-10-22T12:00:00Z').toISOString(), '2026-10-21T09:00:00.000Z');
});

test('a check-in just after midnight still gets the reminder on the previous day', () => {
  assert.equal(sendAt('2026-10-21T00:30:00Z').toISOString(), '2026-10-20T09:00:00.000Z');
});

test('with a UTC+3 hotel the reminder goes out at 09:00 local time', () => {
  assert.equal(sendAt('2026-10-22T12:00:00Z', 180).toISOString(), '2026-10-21T06:00:00.000Z');
});
EOF
git add test/reminders.test.js
commit_on "test(reminders): cover the day boundary"

# 10. Whitespace only.
cat > src/reports.js <<'EOF'
// Share of available room-nights that are booked, as a whole percentage.
function occupancyRate(bookedNights, availableNights) {
  if (availableNights === 0) {
    return 0;
  }

  return Math.round((bookedNights / availableNights) * 100);
}

module.exports = { occupancyRate };
EOF
git add src/reports.js
commit_on "style: format reports module"
