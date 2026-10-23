#!/bin/bash
# DV3: stayhub. A half-resolved merge: src/labels.js still holds conflict markers and is staged, with a real
# pricing fix also staged. No test loads src/labels.js, so the tests pass. Usage: fixture.sh <empty directory>.
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
commit_on() { GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" git commit -q -m "$2"; }

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
commit_on "2026-10-14T10:00:00+00:00" "chore: initial stayhub pricing and reminders"

cat > src/labels.js <<'EOF'
// Room labels for printing.
function labelHeader() {
  return 'room,guest';
}

module.exports = { labelHeader };
EOF
git add src/labels.js
commit_on "2026-10-15T10:00:00+00:00" "feat(labels): add a header to printed room labels"
git tag v1.4.0

# The branch side and the main side both change the header line.
git checkout -q -b feature/labels
cat > src/labels.js <<'EOF'
// Room labels for printing.
function labelHeader() {
  return 'room,guest,checkIn';
}

module.exports = { labelHeader };
EOF
git add src/labels.js
commit_on "2026-10-16T10:00:00+00:00" "feat(labels): add the check-in date to the label header"
git checkout -q main
cat > src/labels.js <<'EOF'
// Room labels for printing.
function labelHeader() {
  return 'room,guest,stay';
}

module.exports = { labelHeader };
EOF
git add src/labels.js
commit_on "2026-10-17T10:00:00+00:00" "chore(labels): rename the header column to stay"

# Merge, which conflicts; then a half-resolved file is staged.
git merge -q --no-ff --no-commit feature/labels >/dev/null 2>&1 || true
cat > src/labels.js <<'EOF'
// Room labels for printing.
function labelHeader() {
<<<<<<< HEAD
  return 'room,guest,stay';
=======
  return 'room,guest,checkIn';
>>>>>>> feature/labels
}

module.exports = { labelHeader };
EOF
git add src/labels.js

# A real fix, staged with it: the weekly discount was not applied.
cat > src/pricing.js <<'EOF'
const NIGHTLY_RATE_EUR = 120;

function quote(nights) {
  const gross = nights * NIGHTLY_RATE_EUR;
  return nights >= 7 ? Math.round(gross * 0.9) : gross;
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

test('a stay of seven nights or more gets 10 percent off', () => {
  assert.equal(quote(7), 756);
});
EOF
git add src/pricing.js test/pricing.test.js
