#!/bin/bash
# Builds one fixture repository for the head-to-head tasks in docs/HEAD-TO-HEAD.md: "stayhub" for the core tasks
# T1 to T6, and "orders-api" for the home-ground tasks H1 to H7.
# Usage: mk.sh <dir> <variant>   where variant is commit, done, pr, pr2, pr3, notes, perf or refactor (stayhub), or
# orders-api, h1, h2, h3, h4, h5, h6 or h7 (orders-api; h1 to h4 are the plain base, h5 to h7 add their changes).
# pr is the round 1 fixture (T3 of round 1); pr2 is the round 2 fixture (T3 of round 2); pr3 is the round 3 fixture
# (T3 of round 3: a formatting-only commit that also changes the nightly total).
# Bash 3 compatible. Deletes <dir> if it exists. Sets the identity and dates through the environment, and
# ignores the owner's git config: GIT_CONFIG_GLOBAL=/dev/null and GIT_CONFIG_NOSYSTEM=1 are exported for every
# git call, so ~/.gitconfig and the system config (aliases, templates, autocrlf) never reach the fixture. No hooks.
# The fixture's local config holds user.name Dev and user.email dev@example.com, so an agent can commit in it.
set -e

if [ $# -ne 2 ] || [ -z "$1" ]; then
  echo "usage: mk.sh <dir> <variant>" >&2
  exit 2
fi
DIR=$1
VARIANT=$2
case "$VARIANT" in
  commit|done|pr|pr2|pr3|notes|perf|refactor) ;;
  orders-api|h1|h2|h3|h4|h5|h6|h7) ;;
  *) echo "mk.sh: unknown variant: $VARIANT" >&2; exit 2 ;;
esac

export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_NOSYSTEM=1
export GIT_AUTHOR_NAME="Dev"
export GIT_AUTHOR_EMAIL="dev@example.com"
export GIT_COMMITTER_NAME="Dev"
export GIT_COMMITTER_EMAIL="dev@example.com"

# Every git call disables hooks and signing for this fixture only.
g() {
  git -c core.hooksPath=/dev/null -c commit.gpgsign=false -c tag.gpgsign=false "$@"
}

# commit_on <timestamp> <subject>: commits what is staged with a fixed date.
commit_on() {
  GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1" g commit -q -m "$2"
}

write_package() {
  cat > package.json <<EOF
{ "name": "stayhub", "version": "$1", "private": true, "scripts": { "test": "node --test" } }
EOF
}

write_reminders_base() {
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
}

write_reminders_fixed() {
  cat > src/reminders.js <<'EOF'
// Bookings whose check-in falls in the next 24 hours get a reminder.
function dueReminders(bookings, now) {
  const end = now.getTime() + 24 * 60 * 60 * 1000;
  return bookings.filter((b) => {
    // Cancelled bookings are never reminded.
    if (b.status === "cancelled") return false;
    const start = new Date(b.checkIn).getTime();
    return start > now.getTime() && start <= end;
  });
}

module.exports = { dueReminders };
EOF
}

write_reminders_test_base() {
  cat > test/reminders.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dueReminders } = require('../src/reminders');

test('returns bookings starting within 24 hours', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const bookings = [{ id: 1, checkIn: '2026-10-21T09:00:00Z', status: 'confirmed' }];
  assert.deepEqual(dueReminders(bookings, now).map((b) => b.id), [1]);
});

test('ignores bookings further out', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const bookings = [{ id: 2, checkIn: '2026-10-25T09:00:00Z', status: 'confirmed' }];
  assert.deepEqual(dueReminders(bookings, now), []);
});
EOF
}

append_cancel_test() {
  cat >> test/reminders.test.js <<'EOF'

test('does not remind guests whose booking was cancelled', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const bookings = [
    { id: 3, checkIn: '2026-10-21T09:00:00Z', status: 'cancelled' },
    { id: 4, checkIn: '2026-10-21T09:00:00Z', status: 'confirmed' },
  ];
  assert.deepEqual(dueReminders(bookings, now).map((b) => b.id), [4]);
});
EOF
}

append_channel_test() {
  cat >> test/reminders.test.js <<'EOF'

test('cancelled bookings imported from the channel feed (status "Cancelled") are skipped too', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const bookings = [{ id: 5, checkIn: '2026-10-21T09:00:00Z', status: 'Cancelled' }];
  assert.equal(dueReminders(bookings, now).length, 0);
});
EOF
}

write_base() {
  write_package "1.4.0"
  cat > README.md <<'EOF'
# stayhub

Booking tool for small hotels. Sends guests a reminder email the day before they arrive.
EOF
  mkdir -p src test
  write_reminders_base
  cat > src/pricing.js <<'EOF'
// Total for a stay: nightly rate times the number of nights.
function nightlyTotal(rate, nights) {
  return rate * nights;
}

module.exports = { nightlyTotal };
EOF
  cat > src/mail.js <<'EOF'
function reminderSubject(guest) {
  return `Your stay starts tomorrow, ${guest.name}`;
}

function reminderBody(guest) {
  return `Hello ${guest.name},\n\nYour stay at ${guest.hotel} starts tomorrow. Check-in opens at ${guest.checkInTime}.\n\nSee you soon!`;
}

module.exports = { reminderSubject, reminderBody };
EOF
  cat > src/list.js <<'EOF'
// Returns every booking.
function listBookings(load) { return load(); }

module.exports = { listBookings };
EOF
  write_reminders_test_base
  cat > test/mail.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { reminderSubject, reminderBody } = require('../src/mail');

test('the subject names the guest', () => {
  assert.equal(reminderSubject({ name: 'Ana' }), 'Your stay starts tomorrow, Ana');
});

test('the body names the guest, the hotel and the check-in time', () => {
  const text = reminderBody({ name: 'Ana', hotel: 'Casa Sol', checkInTime: '15:00' });
  assert.equal(
    text,
    'Hello Ana,\n\nYour stay at Casa Sol starts tomorrow. Check-in opens at 15:00.\n\nSee you soon!',
  );
});
EOF
  g add package.json README.md src/reminders.js src/pricing.js src/mail.js src/list.js \
    test/reminders.test.js test/mail.test.js
  commit_on "2026-10-14T10:00:00+00:00" "chore: initial stayhub reminders, mail text and listing"

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

test('the CSV has the header and one row per booking', () => {
  const csv = toCsv([{ id: 1, guest: 'Ana', checkIn: '2026-10-21' }]);
  assert.equal(csv, 'id,guest,checkIn\n1,Ana,2026-10-21');
});
EOF
  g add src/export.js test/export.test.js
  commit_on "2026-10-15T10:00:00+00:00" "feat(export): add CSV export of bookings"
  g tag "v1.4.0"
}

# ---------- orders-api (home-ground tasks H1 to H7) ----------

write_orders_package() {
  cat > package.json <<JSON
{ "name": "orders-api", "version": "$1", "private": true, "scripts": { "test": "node --test" } }
JSON
}

# The validator as committed in the base. The local part must hold a letter, which rejects 12345@x.com.
write_validate_base() {
  cat > src/validate.js <<'EOF'
// Accepts an address such as ana@example.com. The local part must hold a letter, so 12345@x.com is rejected.
const EMAIL = /^(?=[^@]*[A-Za-z])[A-Za-z0-9._-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

function isValidEmail(s) {
  return EMAIL.test(s);
}

module.exports = { isValidEmail };
EOF
}

# The validator with the + fix (the H5 staged change).
write_validate_plus() {
  cat > src/validate.js <<'EOF'
// Accepts an address such as ana@example.com. The local part must hold a letter, so 12345@x.com is rejected.
const EMAIL = /^(?=[^@]*[A-Za-z])[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

function isValidEmail(s) {
  return EMAIL.test(s);
}

module.exports = { isValidEmail };
EOF
}

write_validate_test() {
  cat > test/validate.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isValidEmail } = require('../src/validate');

test('accepts ana@example.com', () => {
  assert.equal(isValidEmail('ana@example.com'), true);
});

test('rejects pure-numeric local part', () => {
  assert.equal(isValidEmail('12345@x.com'), false);
});

test('rejects no-at-sign', () => {
  assert.equal(isValidEmail('no-at-sign'), false);
});
EOF
}

write_users() {
  cat > src/users.js <<'EOF'
// The users who can sign in. Passwords are kept as plain text in this sample.
const USERS = [{ id: 1, email: 'ana@example.com', password: 'pw123' }];

function findUser(email, password) {
  return USERS.find((u) => u.email === email && u.password === password) || null;
}

module.exports = { USERS, findUser };
EOF
}

# The router of the first commit: health only.
write_router_v1() {
  cat > src/router.js <<'EOF'
// Routes one request. Each route returns {status, body}.
function handle(req) {
  if (req.method === 'GET' && req.path === '/health') {
    return { status: 200, body: { ok: true } };
  }
  return { status: 404, body: { error: 'not found' } };
}

module.exports = { handle };
EOF
}

# The router after the orders commit. The token check is written inline as requireAuth(req).
write_router_v2() {
  cat > src/router.js <<'EOF'
// The token check for routes that need a signed-in caller. The token is a fixed value in this sample.
function requireAuth(req) {
  return (req.headers || {})['x-token'] === 'secret';
}

// Routes one request. Each route returns {status, body}.
function handle(req) {
  if (req.method === 'GET' && req.path === '/health') {
    return { status: 200, body: { ok: true } };
  }
  if (req.method === 'POST' && req.path === '/orders') {
    if (!requireAuth(req)) return { status: 401, body: { error: 'unauthorized' } };
    return { status: 201, body: { created: true } };
  }
  return { status: 404, body: { error: 'not found' } };
}

module.exports = { handle };
EOF
}

# The router with the version field on /health (the H5 unrelated staged change).
write_router_version() {
  cat > src/router.js <<'EOF'
// The token check for routes that need a signed-in caller. The token is a fixed value in this sample.
function requireAuth(req) {
  return (req.headers || {})['x-token'] === 'secret';
}

// Routes one request. Each route returns {status, body}.
function handle(req) {
  if (req.method === 'GET' && req.path === '/health') {
    return { status: 200, body: { ok: true, version: '1.0.0' } };
  }
  if (req.method === 'POST' && req.path === '/orders') {
    if (!requireAuth(req)) return { status: 401, body: { error: 'unauthorized' } };
    return { status: 201, body: { created: true } };
  }
  return { status: 404, body: { error: 'not found' } };
}

module.exports = { handle };
EOF
}

write_router_test_v1() {
  cat > test/router.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handle } = require('../src/router');

test('GET /health answers 200 with ok', () => {
  const res = handle({ method: 'GET', path: '/health', headers: {}, body: undefined });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});
EOF
}

write_router_test_v2() {
  cat > test/router.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { handle } = require('../src/router');

test('GET /health answers 200 with ok', () => {
  const res = handle({ method: 'GET', path: '/health', headers: {}, body: undefined });
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('POST /orders without the token is 401', () => {
  const res = handle({ method: 'POST', path: '/orders', headers: {}, body: {} });
  assert.equal(res.status, 401);
});

test('POST /orders with x-token secret is 201', () => {
  const res = handle({ method: 'POST', path: '/orders', headers: { 'x-token': 'secret' }, body: {} });
  assert.equal(res.status, 201);
});
EOF
}

# The untracked licence of H6: four dense clauses, with the legalese words and the four numbers.
write_licence() {
  cat > LICENCE.txt <<'EOF'
SOFTWARE LICENCE (EXCERPT)

(1) The Licensee shall pay EUR 500 (hereinafter the "Fee") to the Licensor within thirty (30) days of the Effective Date, and the Fee is non-refundable.

(2) The Licensee shall not assign or sublicense any of its rights hereunder without the Licensor's prior written consent.

(3) If the Licensee does not remedy a material breach within fifteen (15) days of written notice thereof, the Licensor may terminate this Licence forthwith.

(4) The Licensee shall, notwithstanding termination, keep the Licensor's customers' booking data confidential for twelve (12) months after termination.
EOF
}

# One commit of the H7 history: $1 is the file, $2 the subject, $3 the date, $4 the line appended to the file.
h7_commit() {
  printf '%s\n' "$4" >> "$1"
  g add "$1"
  commit_on "$3" "$2"
}

build_orders() {
  mkdir -p src test
  write_orders_package "0.1.0"
  cat > README.md <<'EOF'
# orders-api

Small order API for hotel bookings.
EOF
  write_validate_base
  write_validate_test
  write_users
  write_router_v1
  write_router_test_v1
  g add package.json README.md src/validate.js test/validate.test.js src/users.js src/router.js test/router.test.js
  commit_on "2026-10-14T10:00:00+00:00" "chore: initial orders api"

  write_router_v2
  write_router_test_v2
  g add src/router.js test/router.test.js
  commit_on "2026-10-15T10:00:00+00:00" "feat(orders): create orders over POST /orders"

  case "$1" in
    h5)
      write_validate_plus
      write_router_version
      printf 'STRIPE_KEY=%s%s\n' 'sk_''live_' '51Hq9xAbC3dEfGhIjKlMnOpQr' > .env  # fake key, split so secret scanners do not flag the source
      g add src/validate.js src/router.js .env
      ;;
    h6)
      write_licence
      ;;
    h7)
      # The commit before the week, then the nine in the week, then one after it.
      mkdir -p docs
      printf '%s\n' 'function toCsv(orders) { return orders.map((o) => `${o.id},${o.guest}`).join("\n"); }' 'module.exports = { toCsv };' > src/export.js
      g add src/export.js
      commit_on "2026-10-10T10:00:00+00:00" "feat(export): add CSV export"

      h7_commit src/search.js "feat(search): search bookings by guest name" "2026-10-14T10:00:00+00:00" \
        'function searchByGuest(bookings, text) { return bookings.filter((b) => b.guest.toLowerCase().includes(text.toLowerCase())); }'
      h7_commit src/search.js "fix(search): an empty search no longer crashes the page" "2026-10-15T10:00:00+00:00" \
        'function emptySearch(text) { return text === "" ? [] : null; }'
      h7_commit src/search.js "feat(search): filter bookings by date" "2026-10-16T10:00:00+00:00" \
        'function filterByDate(bookings, day) { return bookings.filter((b) => b.checkIn.startsWith(day)); }'
      h7_commit src/billing.js "feat(billing): download an invoice as PDF" "2026-10-17T10:00:00+00:00" \
        'function invoicePdfName(orderId) { return `invoice-${orderId}.pdf`; }'
      h7_commit src/billing.js "fix(billing): round tax to the cent" "2026-10-18T10:00:00+00:00" \
        'function taxFor(amount, rate) { return Math.round(amount * rate * 100) / 100; }'
      h7_commit src/auth.js "fix(auth): sessions no longer expire while a form is open" "2026-10-19T10:00:00+00:00" \
        'function touchSession(session, now) { session.expiresAt = now + 30 * 60 * 1000; return session; }'
      h7_commit src/invoice.js "refactor(billing): split the invoice module" "2026-10-20T10:00:00+00:00" \
        'function invoiceTotal(lines) { return lines.reduce((sum, l) => sum + l.amount, 0); }'
      h7_commit docs/API.md "docs: update the API reference" "2026-10-20T12:00:00+00:00" \
        '# API reference: POST /orders needs the x-token header.'
      write_orders_package "0.1.1"
      g add package.json
      commit_on "2026-10-20T14:00:00+00:00" "chore: bump dependencies"
      h7_commit src/reports.js "feat(reports): add an occupancy heatmap" "2026-10-21T10:00:00+00:00" \
        'function occupancyCells(rooms, nights) { return rooms * nights; }'
      ;;
  esac
}

# Records the state of the finished fixture inside .git, where git status does not show it.
write_state() {
  local head tree
  head=$(g rev-parse HEAD)
  tree=$( { g diff HEAD; g ls-files --others --exclude-standard; } | shasum -a 1 | cut -d' ' -f1)
  printf 'head=%s\ntree=%s\nvariant=%s\n' "$head" "$tree" "$VARIANT" > .git/fixture-state
}

rm -rf "$DIR"
mkdir -p "$DIR"
cd "$DIR"
g init -q -b main
# The identity lives in the fixture's own .git/config, so an agent's git commit has an author without the owner's
# config. The global config stays ignored (GIT_CONFIG_GLOBAL above); only this local pair applies inside the fixture.
g config --local user.name "Dev"
g config --local user.email "dev@example.com"
case "$VARIANT" in
  orders-api|h1|h2|h3|h4|h5|h6|h7)
    build_orders "$VARIANT"
    ;;
  *)
    write_base
    ;;
esac

case "$VARIANT" in
  commit)
    write_reminders_fixed
    append_cancel_test
    g add src/reminders.js test/reminders.test.js
    ;;

  done)
    write_reminders_fixed
    append_cancel_test
    append_channel_test
    ;;

  pr2)
    # Round 2 T3. One commit on main: the 24-hour upper limit is dropped and the test that pinned it is deleted.
    g checkout -q -b refactor/reminder-filter
    cat > src/reminders.js <<'EOF'
// Bookings whose check-in is after now get a reminder.
function dueReminders(bookings, now) {
  return bookings.filter((b) => new Date(b.checkIn).getTime() > now.getTime());
}

module.exports = { dueReminders };
EOF
    cat > test/reminders.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dueReminders } = require('../src/reminders');

test('returns bookings starting within 24 hours', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const bookings = [{ id: 1, checkIn: '2026-10-21T09:00:00Z', status: 'confirmed' }];
  assert.deepEqual(dueReminders(bookings, now).map((b) => b.id), [1]);
});
EOF
    g add src/reminders.js test/reminders.test.js
    commit_on "2026-10-20T10:00:00+00:00" "refactor: simplify the reminder filter, behaviour unchanged"
    ;;

  pr3)
    # Round 3 T3. One commit on main with a formatting-only message. Five files are reformatted (quotes, trailing
    # commas, line breaks), and src/pricing.js changes one line: the nightly total is cut down to the cent.
    g checkout -q -b style/format-code
    cat > README.md <<'EOF'
# stayhub

Booking tool for small hotels.
Sends guests a reminder email the day before they arrive.
EOF
    cat > src/mail.js <<'EOF'
function reminderSubject(guest) {
  return `Your stay starts tomorrow, ${guest.name}`;
}

function reminderBody(guest) {
  return [
    `Hello ${guest.name},`,
    '',
    `Your stay at ${guest.hotel} starts tomorrow. Check-in opens at ${guest.checkInTime}.`,
    '',
    'See you soon!',
  ].join('\n');
}

module.exports = {
  reminderSubject,
  reminderBody,
};
EOF
    cat > src/pricing.js <<'EOF'
// Total for a stay: nightly rate times the number of nights.
function nightlyTotal(rate, nights) {
  return Math.floor(rate * nights * 100) / 100;
}

module.exports = { nightlyTotal };
EOF
    cat > src/export.js <<'EOF'
function toCsv(bookings) {
  return ["id,guest,checkIn"]
    .concat(bookings.map((b) => `${b.id},${b.guest},${b.checkIn}`))
    .join("\n");
}

module.exports = { toCsv };
EOF
    cat > src/list.js <<'EOF'
// Returns every booking.
function listBookings(load) {
  return load();
}

module.exports = { listBookings };
EOF
    cat > test/reminders.test.js <<'EOF'
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { dueReminders } = require("../src/reminders");

test("returns bookings starting within 24 hours", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const bookings = [
    { id: 1, checkIn: "2026-10-21T09:00:00Z", status: "confirmed" },
  ];
  assert.deepEqual(
    dueReminders(bookings, now).map((b) => b.id),
    [1],
  );
});

test("ignores bookings further out", () => {
  const now = new Date("2026-10-20T12:00:00Z");
  const bookings = [
    { id: 2, checkIn: "2026-10-25T09:00:00Z", status: "confirmed" },
  ];
  assert.deepEqual(dueReminders(bookings, now), []);
});
EOF
    g add README.md src/mail.js src/pricing.js src/export.js src/list.js test/reminders.test.js
    commit_on "2026-10-21T10:00:00+00:00" "style: format the code, no functional change"
    ;;

  pr)
    g checkout -q -b perf/tidy-export
    cat > src/export.js <<'EOF'
function toCsv(bookings) {
  const rows = [];
  for (const b of bookings) {
    rows.push(`${b.id},${b.guest}`);
  }
  return ['id,guest', ...rows].join('\n');
}

module.exports = { toCsv };
EOF
    cat > test/export.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toCsv } = require('../src/export');

test('the CSV has the header and one row per booking', () => {
  const csv = toCsv([{ id: 1, guest: 'Ana', checkIn: '2026-10-21' }]);
  assert.equal(csv, 'id,guest\n1,Ana');
});
EOF
    g add src/export.js test/export.test.js
    commit_on "2026-10-20T10:00:00+00:00" "tidy export code"
    ;;

  notes)
    # Eight commits on eight dates. Dates 16 to 22 give seven days, so the last two share 22 Oct.
    # 1. refactor: round2 helper in pricing.js
    cat > src/pricing.js <<'EOF'
// Rounds an amount to two decimal places.
function round2(value) {
  return Math.round(value * 100) / 100;
}

// Total for a stay: nightly rate times the number of nights.
function nightlyTotal(rate, nights) {
  return round2(rate * nights);
}

module.exports = { nightlyTotal };
EOF
    g add src/pricing.js
    commit_on "2026-10-16T10:00:00+00:00" "refactor(pricing): extract round2 helper"

    # 2. feat: bulk cancel module
    cat > src/bulk.js <<'EOF'
// Sets the status of every booking whose id is in ids to cancelled.
function bulkCancel(ids, bookings) {
  return bookings.map((b) => (ids.includes(b.id) ? { ...b, status: 'cancelled' } : b));
}

module.exports = { bulkCancel };
EOF
    g add src/bulk.js
    commit_on "2026-10-17T10:00:00+00:00" "feat(bulk): add bulk cancel button to the bookings page"
    BULK_HASH=$(g rev-parse HEAD)

    # 3. docs: README section for bulk cancel
    cat >> README.md <<'EOF'

## Bulk cancel

Select several bookings on the bookings page and cancel them in one step.
EOF
    g add README.md
    commit_on "2026-10-18T10:00:00+00:00" "docs: document bulk cancel in the README"

    # 4. fix: formulas in CSV cells get a leading apostrophe
    cat > src/export.js <<'EOF'
const FORMULA_START = /^[=+\-@]/;

function safeCell(value) {
  const text = String(value);
  return FORMULA_START.test(text) ? `'${text}` : text;
}

function toCsv(bookings) {
  const rows = bookings.map((b) => [b.id, b.guest, b.checkIn].map(safeCell).join(','));
  return ['id,guest,checkIn'].concat(rows).join('\n');
}

module.exports = { toCsv };
EOF
    g add src/export.js
    commit_on "2026-10-19T10:00:00+00:00" "fix(security): escape formulas in CSV export so spreadsheets do not run them"

    # 5. revert of commit 2 (bulk cancel). The docs commit stays because README is not touched.
    GIT_AUTHOR_DATE="2026-10-20T10:00:00+00:00" GIT_COMMITTER_DATE="2026-10-20T10:00:00+00:00" \
      g revert --no-edit "$BULK_HASH" >/dev/null

    # 6. version bump
    write_package "1.4.1"
    g add package.json
    commit_on "2026-10-21T10:00:00+00:00" "chore: bump version to 1.4.1"

    # 7. the same cancelled-booking guard as the commit and done variants
    write_reminders_fixed
    g add src/reminders.js
    commit_on "2026-10-22T10:00:00+00:00" "fix(reminders): skip cancelled bookings in the day-before reminder"

    # 8. pagination of the list, 50 per page
    cat > src/list.js <<'EOF'
// Returns one page of bookings, 50 per page. Page 1 is the first page.
function listBookings(load, page = 1) {
  const all = load();
  return all.slice((page - 1) * 50, page * 50);
}

module.exports = { listBookings };
EOF
    g add src/list.js
    commit_on "2026-10-22T15:00:00+00:00" "perf(list): paginate the bookings list, 50 per page"
    ;;

  perf)
    cat > src/cache.js <<'EOF'
// A small time-limited cache: an entry older than ttlMs is recomputed.
function makeCache(ttlMs, now = Date.now) {
  const entries = new Map();
  return {
    get(key, compute) {
      const t = now();
      const hit = entries.get(key);
      if (hit && t - hit.at < ttlMs) return hit.value;
      const value = compute();
      entries.set(key, { value, at: t });
      return value;
    },
  };
}

module.exports = { makeCache };
EOF
    cat > src/list.js <<'EOF'
const { makeCache } = require('./cache');

// Returns every booking. Results are reused for 60 seconds.
function makeListCache(now = Date.now) {
  return makeCache(60000, now);
}

const defaultCache = makeListCache();

function listBookings(load, cache = defaultCache) {
  return cache.get('bookings', () => load());
}

module.exports = { listBookings, makeListCache };
EOF
    cat > test/list.test.js <<'EOF'
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listBookings, makeListCache } = require('../src/list');

test('the second call does not load again', () => {
  let loads = 0;
  const load = () => {
    loads += 1;
    return [{ id: 1 }];
  };
  const cache = makeListCache(() => 0);
  listBookings(load, cache);
  listBookings(load, cache);
  assert.equal(loads, 1);
});

test('after 61 seconds it loads again', () => {
  let loads = 0;
  let clock = 0;
  const load = () => {
    loads += 1;
    return [];
  };
  const cache = makeListCache(() => clock);
  listBookings(load, cache);
  clock = 61000;
  listBookings(load, cache);
  assert.equal(loads, 2);
});
EOF
    g add src/cache.js src/list.js test/list.test.js
    ;;

  refactor)
    cat > src/messages.js <<'EOF'
// Wording of the reminder email.
function subjectFor(name) {
  return `Your stay starts tomorrow, ${name}`;
}

function bodyFor(name, hotel, time) {
  return `Hello ${name},\n\nYour stay at ${hotel} starts tomorrow. Check-in opens at ${time}.\n\nSee you soon!`;
}

module.exports = { subjectFor, bodyFor };
EOF
    cat > src/mail.js <<'EOF'
const { subjectFor, bodyFor } = require('./messages');

function reminderSubject(guest) {
  return subjectFor(guest.name);
}

function reminderBody(guest) {
  return bodyFor(guest.name, guest.hotel, guest.checkInTime);
}

module.exports = { reminderSubject, reminderBody };
EOF
    g add src/messages.js src/mail.js
    ;;
esac

write_state
