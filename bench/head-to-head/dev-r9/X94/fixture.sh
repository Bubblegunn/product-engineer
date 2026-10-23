#!/bin/bash
# DV4: stayhub. Fourteen commits after tag v1.4.0: a feature, its revert, the feature re-added by a revert of the
# revert, a docs commit, a version bump, a security fix, a "docs:" commit that changes a price, and filler.
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
# revert_head: git revert of HEAD with the next fixed date.
revert_head() {
  local stamp; stamp=$(next_stamp)
  GIT_AUTHOR_DATE="$stamp" GIT_COMMITTER_DATE="$stamp" git revert --no-edit HEAD
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
git add package.json README.md src/pricing.js test/pricing.test.js src/reminders.js test/reminders.test.js
GIT_AUTHOR_DATE="2026-10-14T10:00:00+00:00" GIT_COMMITTER_DATE="2026-10-14T10:00:00+00:00" git commit -q -m "chore: initial stayhub pricing and reminders"

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
git add src/export.js test/export.test.js
GIT_AUTHOR_DATE="2026-10-15T10:00:00+00:00" GIT_COMMITTER_DATE="2026-10-15T10:00:00+00:00" git commit -q -m "feat(export): add CSV export of bookings"
git tag v1.4.0
DAY=15

# 1. The feature.
cat > src/checkout.js <<'EOF'
// A guest may ask for late checkout; the hotel grants it up to 14:00 the next day.
function requestLateCheckout(booking, until = '14:00') {
  return { ...booking, lateCheckoutUntil: until };
}

module.exports = { requestLateCheckout };
EOF
cat > test/checkout.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { requestLateCheckout } = require('../src/checkout');

test('a late checkout request is held until 14:00 by default', () => {
  assert.equal(requestLateCheckout({ id: 1 }).lateCheckoutUntil, '14:00');
});
EOF
git add src/checkout.js test/checkout.test.js
commit_on "feat(checkout): add late checkout request"

# 2. Its revert. 3. The revert of the revert: the feature is back.
revert_head
revert_head

# 4. Docs.
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.

## Setup

Run `npm install`, then `npm test`. The reminder job reads the bookings file from the path in the environment.
EOF
git add README.md
commit_on "docs: explain setup in README"

# 5. Version bump.
cat > package.json <<'EOF'
{ "name": "stayhub", "version": "1.5.0", "private": true, "scripts": { "test": "node --test" } }
EOF
git add package.json
commit_on "chore: bump version to 1.5.0"

# 6. Security fix: a guest name that starts with a spreadsheet formula character is neutralised in the export.
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

# 7. A "docs:" commit that changes the nightly rate.
cat > src/pricing.js <<'EOF'
const NIGHTLY_RATE_EUR = 135;

function quote(nights) {
  return nights * NIGHTLY_RATE_EUR;
}

module.exports = { quote, NIGHTLY_RATE_EUR };
EOF
git add src/pricing.js
commit_on "docs: update nightly rate note"

# 8. Filler: a fix to cancelled bookings in reminders.
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

# 9. Filler: a test for a one-night stay.
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

# 10. Filler: name the window.
cat > src/reminders.js <<'EOF'
// Bookings whose check-in falls in the next 24 hours get a reminder.
const WINDOW_HOURS = 24;

function dueReminders(bookings, now) {
  const end = now.getTime() + WINDOW_HOURS * 60 * 60 * 1000;
  return bookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    const start = new Date(b.checkIn).getTime();
    return start > now.getTime() && start <= end;
  });
}

module.exports = { dueReminders };
EOF
git add src/reminders.js
commit_on "refactor(reminders): name the reminder window"

# 11. Filler: a test for a booking with no status.
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

test('a booking with no status is still reminded', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(dueReminders([{ id: 3, checkIn: '2026-10-21T09:00:00Z' }], now).length, 1);
});
EOF
git add test/reminders.test.js
commit_on "test(reminders): cover a booking with no status"

# 12. Filler: a test for the export with a guest name.
cat > test/export.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toCsv } = require('../src/export');

test('an empty list exports the header only', () => {
  assert.equal(toCsv([]), 'id,guest,checkIn');
});

test('a plain guest name is exported unchanged', () => {
  assert.equal(toCsv([{ id: 2, guest: 'Ana', checkIn: '2026-10-21' }]), 'id,guest,checkIn\n2,Ana,2026-10-21');
});

test('a guest name that starts with a formula character is neutralised', () => {
  assert.equal(toCsv([{ id: 1, guest: '=1+1', checkIn: '2026-10-21' }]), "id,guest,checkIn\n1,'=1+1,2026-10-21");
});
EOF
git add test/export.test.js
commit_on "test(export): cover a plain guest name"

# 13. Filler: the comment names the constant.
cat > src/reminders.js <<'EOF'
// Bookings whose check-in falls in the next WINDOW_HOURS hours get a reminder.
const WINDOW_HOURS = 24;

function dueReminders(bookings, now) {
  const end = now.getTime() + WINDOW_HOURS * 60 * 60 * 1000;
  return bookings.filter((b) => {
    if (b.status === 'cancelled') return false;
    const start = new Date(b.checkIn).getTime();
    return start > now.getTime() && start <= end;
  });
}

module.exports = { dueReminders };
EOF
git add src/reminders.js
commit_on "chore: tidy spacing in reminders"

# 14. Filler: the setup section says where the path comes from.
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.

## Setup

Run `npm install`, then `npm test`. The reminder job reads the bookings file from the path in the BOOKINGS_FILE variable.
EOF
git add README.md
commit_on "docs: name the variable that holds the bookings file path"
