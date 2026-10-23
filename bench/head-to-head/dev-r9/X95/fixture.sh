#!/bin/bash
# DV5: stayhub. Ten commits after tag v1.4.0: a feature added then reverted; a fix that is reverted and then
# cherry-picked back (a duplicate pair with the same patch and message); a perf commit that commits a timing file;
# a perf commit with no measurement; a README and a version bump; a test.
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

# next_stamp: the next fixed date, one per commit.
next_stamp() {
  DAY=$((DAY + 1))
  printf '2026-10-%02dT10:00:00+00:00' "$DAY"
}
# commit_on <subject>: commits what is staged with the next fixed date.
commit_on() {
  local stamp; stamp=$(next_stamp)
  GIT_AUTHOR_DATE="$stamp" GIT_COMMITTER_DATE="$stamp" git commit -q -m "$1"
}
# revert_commit <sha>: git revert of that commit with the next fixed date.
revert_commit() {
  local stamp; stamp=$(next_stamp)
  GIT_AUTHOR_DATE="$stamp" GIT_COMMITTER_DATE="$stamp" git revert --no-edit "$1"
}
# cherry_pick_commit <sha>: git cherry-pick of that commit with the next fixed date.
cherry_pick_commit() {
  local stamp; stamp=$(next_stamp)
  GIT_AUTHOR_DATE="$stamp" GIT_COMMITTER_DATE="$stamp" git cherry-pick "$1"
}

mkdir -p src test
cat > package.json <<'EOF'
{ "name": "stayhub", "version": "1.4.0", "private": true, "scripts": { "test": "node --test" } }
EOF
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.
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
cat > src/reminders.js <<'EOF'
// Bookings whose check-in falls in the next 24 hours get a reminder.
function dueReminders(bookings, now) {
  const end = now.getTime() + 24 * 60 * 60 * 1000;
  return bookings.filter((b) => {
    const start = new Date(b.checkIn).getTime();
    return start > now.getTime() && start <= end;
  });
}

module.exports = { dueReminders };
EOF
cat > test/reminders.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dueReminders } = require('../src/reminders');

test('a booking checking in within 24 hours gets a reminder', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  const bookings = [
    { id: 1, checkIn: '2026-10-21T09:00:00Z' },
    { id: 2, checkIn: '2026-10-25T09:00:00Z' },
  ];
  assert.deepEqual(dueReminders(bookings, now).map((b) => b.id), [1]);
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
git add package.json README.md src/pricing.js test/pricing.test.js src/reminders.js test/reminders.test.js src/export.js test/export.test.js
GIT_AUTHOR_DATE="2026-10-14T10:00:00+00:00" GIT_COMMITTER_DATE="2026-10-14T10:00:00+00:00" git commit -q -m "chore: initial stayhub pricing, reminders and export"
git tag v1.4.0
DAY=14

# 1. A feature, added.
cat > src/groups.js <<'EOF'
// A group booking holds several rooms under one name.
function groupBooking(name, rooms) {
  return { name, rooms, total: rooms.length };
}

module.exports = { groupBooking };
EOF
cat > test/groups.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { groupBooking } = require('../src/groups');

test('a group booking counts its rooms', () => {
  assert.equal(groupBooking('Acme', [101, 102]).total, 2);
});
EOF
git add src/groups.js test/groups.test.js
commit_on "feat(groups): add group bookings"

# 2. The feature is reverted.
GROUPS_SHA=$(git rev-parse HEAD)
revert_commit "$GROUPS_SHA"

# 3. A fix to reminders.
cat > src/reminders.js <<'EOF'
// Bookings whose check-in falls in the next 24 hours get a reminder.
function dueReminders(bookings, now) {
  const end = now.getTime() + 24 * 60 * 60 * 1000;
  return bookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    const start = new Date(b.checkIn).getTime();
    return start > now.getTime() && start <= end;
  });
}

module.exports = { dueReminders };
EOF
git add src/reminders.js
commit_on "fix(reminders): skip cancelled bookings"
FIX_SHA=$(git rev-parse HEAD)

# 4. A performance change with its measurement committed beside it.
cat > src/list.js <<'EOF'
// Returns one page of bookings; pages start at 1.
function listBookings(all, page = 1, size = 50) {
  const start = (page - 1) * size;
  return all.slice(start, start + size);
}

module.exports = { listBookings };
EOF
cat > test/list.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listBookings } = require('../src/list');

test('the second page of 60 bookings has the last 10', () => {
  const all = Array.from({ length: 60 }, (_, i) => i + 1);
  assert.equal(listBookings(all, 2, 50).length, 10);
});
EOF
mkdir -p bench
cat > bench/timing.txt <<'EOF'
bookings list, 10000 rows, Node 22, laptop
method: median of 5 runs, wall-clock, before and after the pagination change
before: 412 ms
after: 38 ms
EOF
git add src/list.js test/list.test.js bench/timing.txt
commit_on "perf(list): paginate the bookings list"

# 5. A performance change with no measurement.
cat > src/export.js <<'EOF'
function toCsv(bookings) {
  const lines = ['id,guest,checkIn'];
  for (const b of bookings) lines.push(`${b.id},${b.guest},${b.checkIn}`);
  return lines.join('\n');
}

module.exports = { toCsv };
EOF
git add src/export.js
commit_on "perf(export): build the CSV rows in one pass"

# 6. The fix is reverted, 7. and cherry-picked back: the same patch and message as step 3.
revert_commit "$FIX_SHA"
cherry_pick_commit "$FIX_SHA"

# 8. Docs.
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.

Reminders are sent by email the day before check-in.
EOF
git add README.md
commit_on "docs: explain how reminders are sent"

# 9. Version bump.
cat > package.json <<'EOF'
{ "name": "stayhub", "version": "1.5.0", "private": true, "scripts": { "test": "node --test" } }
EOF
git add package.json
commit_on "chore: bump version to 1.5.0"

# 10. A test.
cat > test/pricing.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { quote, NIGHTLY_RATE_EUR } = require('../src/pricing');

test('a stay costs the nightly rate for each night', () => {
  assert.equal(quote(2), 2 * NIGHTLY_RATE_EUR);
});

test('a one-night stay costs one nightly rate', () => {
  assert.equal(quote(1), NIGHTLY_RATE_EUR);
});
EOF
git add test/pricing.test.js
commit_on "test(pricing): cover a one-night stay"
