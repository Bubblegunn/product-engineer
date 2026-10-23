#!/bin/bash
# X98: stayhub. Branch feature has three commits on top of main. The commit titled "docs: clarify cancellation
# policy" changes CANCEL_WINDOW_HOURS in src/policy.js from 24 to 48 (and its test). Main is checked out at the end.
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

mkdir -p src test
cat > package.json <<'EOF'
{ "name": "stayhub", "version": "1.4.0", "private": true, "scripts": { "test": "node --test" } }
EOF
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.
EOF
cat > src/policy.js <<'EOF'
// Guests may cancel for free until this many hours before check-in.
const CANCEL_WINDOW_HOURS = 24;

// True if the booking is still more than the window away from check-in.
function canCancelFree(booking, now) {
  const hoursUntil = (new Date(booking.checkIn).getTime() - now.getTime()) / 3600000;
  return hoursUntil > CANCEL_WINDOW_HOURS;
}

module.exports = { canCancelFree, CANCEL_WINDOW_HOURS };
EOF
cat > test/policy.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canCancelFree } = require('../src/policy');

test('a booking 30 hours away can be cancelled free', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(canCancelFree({ checkIn: '2026-10-21T16:00:00Z' }, now), true);
});

test('a booking 12 hours away cannot be cancelled free', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(canCancelFree({ checkIn: '2026-10-20T22:00:00Z' }, now), false);
});
EOF
git add package.json README.md src/policy.js test/policy.test.js
commit_on "2026-10-14T10:00:00+00:00" "chore: initial stayhub cancellation policy"

git checkout -q -b feature

# 1. Titled "docs", but the free-cancellation window doubles from 24 to 48 hours.
cat > src/policy.js <<'EOF'
// Guests may cancel for free until this many hours before check-in.
const CANCEL_WINDOW_HOURS = 48;

// True if the booking is still more than the window away from check-in.
function canCancelFree(booking, now) {
  const hoursUntil = (new Date(booking.checkIn).getTime() - now.getTime()) / 3600000;
  return hoursUntil > CANCEL_WINDOW_HOURS;
}

module.exports = { canCancelFree, CANCEL_WINDOW_HOURS };
EOF
cat > test/policy.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canCancelFree } = require('../src/policy');

test('a booking 50 hours away can be cancelled free', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(canCancelFree({ checkIn: '2026-10-22T12:00:00Z' }, now), true);
});

test('a booking 30 hours away cannot be cancelled free', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(canCancelFree({ checkIn: '2026-10-21T16:00:00Z' }, now), false);
});

test('a booking 12 hours away cannot be cancelled free', () => {
  const now = new Date('2026-10-20T10:00:00Z');
  assert.equal(canCancelFree({ checkIn: '2026-10-20T22:00:00Z' }, now), false);
});
EOF
cat > README.md <<'EOF'
# StayHub

Bookings, reminders and CSV export for small hotels.

Free cancellation: see src/policy.js for the window.
EOF
git add src/policy.js test/policy.test.js README.md
commit_on "2026-10-15T10:00:00+00:00" "docs: clarify cancellation policy"

# 2. Feature.
cat > src/guests.js <<'EOF'
// Adds a note to a guest record without changing the stored record.
function addNote(guest, text) {
  return { ...guest, notes: [...(guest.notes || []), text] };
}

module.exports = { addNote };
EOF
cat > test/guests.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addNote } = require('../src/guests');

test('a note is added to the guest record', () => {
  const guest = { id: 7, name: 'Ana' };
  assert.deepEqual(addNote(guest, 'Late arrival').notes, ['Late arrival']);
});
EOF
git add src/guests.js test/guests.test.js
commit_on "2026-10-16T10:00:00+00:00" "feat(guests): add guest notes field"

# 3. Refactor: a local variable is renamed.
cat > src/policy.js <<'EOF'
// Guests may cancel for free until this many hours before check-in.
const CANCEL_WINDOW_HOURS = 48;

// True if the booking is still more than the window away from check-in.
function canCancelFree(booking, now) {
  const hoursBefore = (new Date(booking.checkIn).getTime() - now.getTime()) / 3600000;
  return hoursBefore > CANCEL_WINDOW_HOURS;
}

module.exports = { canCancelFree, CANCEL_WINDOW_HOURS };
EOF
git add src/policy.js
commit_on "2026-10-17T10:00:00+00:00" "refactor: rename helpers"

git checkout -q main
