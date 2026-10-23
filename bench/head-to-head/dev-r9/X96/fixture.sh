#!/bin/bash
# DV6: stayhub. Branch "feature" has three commits on top of main. The refactor commit says "No behaviour change"
# but its diff flips autoCancelUnpaid from true to false in config/settings.json. Main is checked out at the end.
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

# commit_on <timestamp> <subject>: commits what is staged with a fixed date.
commit_on() {
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"
}

mkdir -p src test config
cat > package.json <<'EOF'
{ "name": "stayhub", "version": "1.4.0", "private": true, "scripts": { "test": "node --test" } }
EOF
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.
EOF
cat > src/settings.js <<'EOF'
// Defaults for the hotel's settings.
const DEFAULTS = { reminderHours: 24, autoCancelUnpaid: true };

function load() {
  return { ...DEFAULTS };
}

module.exports = { load, DEFAULTS };
EOF
cat > src/bookings.js <<'EOF'
// Unpaid bookings are cancelled automatically when the setting is on.
function autoCancelUnpaid(bookings, settings) {
  return settings.autoCancelUnpaid ? bookings.filter((b) => !b.paid) : [];
}

module.exports = { autoCancelUnpaid };
EOF
cat > test/bookings.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { autoCancelUnpaid } = require('../src/bookings');

const list = [
  { id: 1, paid: false },
  { id: 2, paid: true },
];

test('with the setting on, the unpaid bookings are cancelled', () => {
  assert.deepEqual(autoCancelUnpaid(list, { autoCancelUnpaid: true }).map((b) => b.id), [1]);
});

test('with the setting off, nothing is cancelled', () => {
  assert.deepEqual(autoCancelUnpaid(list, { autoCancelUnpaid: false }), []);
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
git add package.json README.md src/settings.js src/bookings.js test/bookings.test.js src/reminders.js test/reminders.test.js
commit_on "2026-10-14T10:00:00+00:00" "chore: initial stayhub settings, bookings and reminders"

cat > src/mail.js <<'EOF'
// The reminder text sent to a guest the day before check-in.
function reminderSubject(guest) {
  return `Your stay starts tomorrow, ${guest.name}`;
}

module.exports = { reminderSubject };
EOF
git add src/mail.js
commit_on "2026-10-15T10:00:00+00:00" "feat(mail): add the reminder subject line"

# The feature branch.
git checkout -q -b feature

cat > src/early-checkin.js <<'EOF'
// A guest who checks in within 6 hours of the given time gets an early check-in reminder.
function earlyCheckinDue(booking, now) {
  const start = new Date(booking.checkIn).getTime();
  const gap = start - now.getTime();
  return gap > 0 && gap <= 6 * 60 * 60 * 1000;
}

module.exports = { earlyCheckinDue };
EOF
cat > test/early-checkin.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { earlyCheckinDue } = require('../src/early-checkin');

test('a check-in four hours away is due', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(earlyCheckinDue({ checkIn: '2026-10-20T14:00:00Z' }, now), true);
});

test('a check-in a day away is not due', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(earlyCheckinDue({ checkIn: '2026-10-21T10:00:00Z' }, now), false);
});
EOF
git add src/early-checkin.js test/early-checkin.test.js
commit_on "2026-10-16T10:00:00+00:00" "feat(checkin): remind guests who check in early"

# The refactor: the defaults move to a JSON file, and the flag is flipped in that file.
cat > config/settings.json <<'EOF'
{
  "reminderHours": 24,
  "autoCancelUnpaid": false
}
EOF
cat > src/settings.js <<'EOF'
// Settings are read from config/settings.json.
const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'config', 'settings.json');

function load() {
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

module.exports = { load };
EOF
git add config/settings.json src/settings.js
commit_on "2026-10-17T10:00:00+00:00" "refactor(settings): read defaults from config/settings.json. No behaviour change."

# A test change on the feature.
cat > test/early-checkin.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { earlyCheckinDue } = require('../src/early-checkin');

test('a check-in four hours away is due', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(earlyCheckinDue({ checkIn: '2026-10-20T14:00:00Z' }, now), true);
});

test('a check-in a day away is not due', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(earlyCheckinDue({ checkIn: '2026-10-21T10:00:00Z' }, now), false);
});

test('a check-in exactly six hours away is due', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(earlyCheckinDue({ checkIn: '2026-10-20T16:00:00Z' }, now), true);
});
EOF
git add test/early-checkin.test.js
commit_on "2026-10-18T10:00:00+00:00" "test(early-checkin): cover the six-hour boundary"

git checkout -q main
