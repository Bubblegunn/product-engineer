#!/usr/bin/env bash
set -euo pipefail
cd "$1"
git init -q -b main
git config user.name "Aiko Tanaka"
git config user.email "aiko@example.test"

setid() {
  case "$1" in
    aiko) N="Aiko Tanaka"; E="aiko@example.test";;
    marco) N="Marco Bellini"; E="marco@example.test";;
    noor) N="Noor Haddad"; E="noor@example.test";;
  esac
  export GIT_AUTHOR_NAME="$N" GIT_AUTHOR_EMAIL="$E" GIT_COMMITTER_NAME="$N" GIT_COMMITTER_EMAIL="$E" \
    GIT_AUTHOR_DATE="$2" GIT_COMMITTER_DATE="$2"
}
ci() { setid "$1" "$2"; git add -A; git commit -q -m "$3"; }

mkdir -p src tests config docs bin

cat > package.json <<'EOF'
{
  "name": "slotbook",
  "version": "0.1.0",
  "description": "Appointment booking engine for small clinics and studios",
  "main": "src/booking.js",
  "scripts": { "test": "node --test" },
  "license": "MIT"
}
EOF
cat > .gitignore <<'EOF'
node_modules/
data/
EOF
cat > README.md <<'EOF'
# slotbook

Appointment booking engine for small clinics and studios.

## Features

- Free-slot calculation inside working hours
- Double-booking protection
- Time zone aware bookings (clients send an ISO time with their offset)

## Usage

See `docs/usage.md`. Run the tests with `node --test`.
EOF
ci aiko "2026-08-03T09:00:00+0000" "chore: project skeleton"

cat > config/slotbook.json <<'EOF'
{
  "slotMinutes": 30,
  "workdayStart": 9,
  "workdayEnd": 17,
  "providerOffsetMinutes": 60
}
EOF
cat > src/config.js <<'EOF'
const fs = require('fs');
const path = require('path');

function load(file) {
  const p = file || path.join(__dirname, '..', 'config', 'slotbook.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

module.exports = { load };
EOF
cat > tests/config.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { load } = require('../src/config');

test('loads defaults', () => {
  const c = load();
  assert.strictEqual(c.slotMinutes, 30);
  assert.strictEqual(c.workdayStart, 9);
});
EOF
ci aiko "2026-08-03T11:00:00+0000" "feat: config file"

cat > src/tz.js <<'EOF'
// Hour-of-day and minutes for an instant, as seen at a fixed offset.
function localParts(date, offsetMinutes) {
  const shifted = new Date(date.getTime() + offsetMinutes * 60000);
  return { hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
}

module.exports = { localParts };
EOF
cat > tests/tz.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { localParts } = require('../src/tz');

test('shifts by offset', () => {
  const d = new Date('2026-11-02T08:00:00Z');
  assert.deepStrictEqual(localParts(d, 60), { hour: 9, minute: 0 });
  assert.deepStrictEqual(localParts(d, -120), { hour: 6, minute: 0 });
});
EOF
ci marco "2026-08-04T10:00:00+0000" "feat: offset helper"

cat > src/store.js <<'EOF'
class Store {
  constructor() {
    this.bookings = [];
    this.nextId = 1;
  }

  add(b) {
    const saved = { ...b, id: this.nextId++ };
    this.bookings.push(saved);
    return saved;
  }

  all() {
    return this.bookings.slice();
  }
}

module.exports = { Store };
EOF
cat > tests/store.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { Store } = require('../src/store');

test('assigns ids', () => {
  const s = new Store();
  assert.strictEqual(s.add({}).id, 1);
  assert.strictEqual(s.add({}).id, 2);
  assert.strictEqual(s.all().length, 2);
});
EOF
ci marco "2026-08-04T14:00:00+0000" "feat: in-memory store"

cat > src/validate.js <<'EOF'
const REPEATS = [undefined, 'daily', 'weekly'];

function validateOptions(opts) {
  if (!opts.name) throw new Error('name required');
  if (!opts.start || Number.isNaN(Date.parse(opts.start))) throw new Error('start must be an ISO time');
  if (!REPEATS.includes(opts.repeat)) throw new Error('repeat must be daily or weekly');
}

module.exports = { validateOptions };
EOF
cat > tests/validate.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { validateOptions } = require('../src/validate');

test('requires name and start', () => {
  assert.throws(() => validateOptions({}));
  assert.throws(() => validateOptions({ name: 'a', start: 'nope' }));
  validateOptions({ name: 'a', start: '2026-11-02T10:00:00+01:00' });
});

test('repeat must be known', () => {
  assert.throws(() => validateOptions({ name: 'a', start: '2026-11-02T10:00:00Z', repeat: 'monthly' }));
});
EOF
ci noor "2026-08-05T09:30:00+0000" "feat: option validation"

cat > src/booking.js <<'EOF'
const { localParts } = require('./tz');
const { validateOptions } = require('./validate');

function create(store, cfg, opts) {
  validateOptions(opts);
  const start = new Date(opts.start);
  const minutes = opts.minutes || cfg.slotMinutes;
  const end = new Date(start.getTime() + minutes * 60000);
  const p = localParts(start, cfg.providerOffsetMinutes);
  if (p.hour < cfg.workdayStart || p.hour >= cfg.workdayEnd) {
    throw new Error('outside working hours');
  }
  const clash = store.all().some((b) => start < b.endUtc && end > b.startUtc);
  if (clash) throw new Error('slot taken');
  return store.add({ name: opts.name, startUtc: start, endUtc: end });
}

module.exports = { create };
EOF
cat > tests/booking.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { create } = require('../src/booking');
const { Store } = require('../src/store');

const cfg = { slotMinutes: 30, workdayStart: 9, workdayEnd: 17, providerOffsetMinutes: 60 };

test('creates a booking', () => {
  const s = new Store();
  const b = create(s, cfg, { name: 'Ana', start: '2026-11-02T10:00:00+01:00' });
  assert.strictEqual(b.id, 1);
});

test('rejects double booking', () => {
  const s = new Store();
  create(s, cfg, { name: 'Ana', start: '2026-11-02T10:00:00+01:00' });
  assert.throws(() => create(s, cfg, { name: 'Bo', start: '2026-11-02T10:15:00+01:00' }), /slot taken/);
});

test('rejects outside working hours', () => {
  const s = new Store();
  assert.throws(() => create(s, cfg, { name: 'Ana', start: '2026-11-02T07:00:00+01:00' }), /working hours/);
});

test('client in another zone is converted', () => {
  const s = new Store();
  // 04:00 in New York (-05:00) is 10:00 at the provider (+01:00)
  const b = create(s, cfg, { name: 'Cy', start: '2026-11-02T04:00:00-05:00' });
  assert.strictEqual(b.startUtc.toISOString(), '2026-11-02T09:00:00.000Z');
});
EOF
ci aiko "2026-08-06T10:00:00+0000" "feat: create bookings with double-booking protection"

cat > src/availability.js <<'EOF'
function freeSlots(day, bookings, cfg) {
  const out = [];
  const offsetH = cfg.providerOffsetMinutes / 60;
  for (let m = cfg.workdayStart * 60; m + cfg.slotMinutes <= cfg.workdayEnd * 60; m += cfg.slotMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const sign = offsetH >= 0 ? '+' : '-';
    const off = String(Math.abs(offsetH)).padStart(2, '0') + ':00';
    const start = new Date(`${day}T${hh}:${mm}:00${sign}${off}`);
    const end = new Date(start.getTime() + cfg.slotMinutes * 60000);
    if (!bookings.some((b) => start < b.endUtc && end > b.startUtc)) out.push(`${hh}:${mm}`);
  }
  return out;
}

module.exports = { freeSlots };
EOF
cat > tests/availability.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { freeSlots } = require('../src/availability');

const cfg = { slotMinutes: 30, workdayStart: 9, workdayEnd: 11, providerOffsetMinutes: 60 };

test('all slots free', () => {
  assert.deepStrictEqual(freeSlots('2026-11-02', [], cfg), ['09:00', '09:30', '10:00', '10:30']);
});

test('booked slot is removed', () => {
  const b = { startUtc: new Date('2026-11-02T09:00:00Z'), endUtc: new Date('2026-11-02T09:30:00Z') };
  assert.deepStrictEqual(freeSlots('2026-11-02', [b], cfg), ['09:00', '09:30', '10:30']);
});
EOF
ci aiko "2026-08-10T10:00:00+0000" "feat: free slot calculation"

cat > docs/architecture.md <<'EOF'
# Architecture

`config` loads `config/slotbook.json`. `booking.create` validates input,
converts the client's time to UTC, checks working hours at the provider's
offset and refuses overlaps. `availability.freeSlots` lists open slots.
Data is held in memory (`store`), nothing is persisted yet.
EOF
ci marco "2026-08-12T09:00:00+0000" "docs: architecture"

cat > docs/usage.md <<'EOF'
# Usage

```js
const { create } = require('./src/booking');
const booking = create(store, cfg, {
  name: 'Ana',
  start: '2026-11-02T10:00:00+01:00',
  minutes: 30,
});
```

Overlapping bookings throw `slot taken`.
EOF
ci marco "2026-08-12T11:00:00+0000" "docs: usage guide"

cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.1.0 - 2026-08-14
- Booking creation, double-booking protection, free-slot calculation
EOF
git add -A
ci aiko "2026-08-14T09:00:00+0000" "chore: release 0.1.0"
git tag v0.1.0

cat > src/reminders.js <<'EOF'
function dueTime(booking, cfg) {
  return new Date(booking.startUtc.getTime() - cfg.reminders.hoursBefore * 3600 * 1000);
}

function scheduleReminder(booking, cfg) {
  if (!cfg.reminders || !cfg.reminders.enabled) return null;
  return { bookingId: booking.id, due: dueTime(booking, cfg), sent: false };
}

// TODO: connect to SMTP (cfg.reminders.smtpHost) and actually deliver
function send(reminder, cfg) {
  return false;
}

module.exports = { dueTime, scheduleReminder, send };
EOF
cat > tests/reminders.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { dueTime, scheduleReminder } = require('../src/reminders');

const cfg = { reminders: { enabled: true, hoursBefore: 24, smtpHost: '' } };
const booking = { id: 1, startUtc: new Date('2026-11-03T10:00:00Z') };

test('reminder is due 24h before', () => {
  assert.strictEqual(dueTime(booking, cfg).toISOString(), '2026-11-02T10:00:00.000Z');
});

test('disabled gives no reminder', () => {
  assert.strictEqual(scheduleReminder(booking, { reminders: { enabled: false } }), null);
});

test.skip('sends the reminder email', () => {
  // needs an SMTP test double
});
EOF
node -e '
const fs=require("fs");const p="config/slotbook.json";const c=JSON.parse(fs.readFileSync(p));
c.reminders={enabled:true,hoursBefore:24,smtpHost:""};fs.writeFileSync(p,JSON.stringify(c,null,2)+"\n");'
ci noor "2026-09-07T10:00:00+0000" "feat: email reminders"

cat >> README.md <<'EOF'

## Reminders

Clients get an email reminder 24 hours before their appointment
(`reminders.hoursBefore` in `config/slotbook.json`).
EOF
ci noor "2026-09-07T10:30:00+0000" "docs: README reminders"

sed -i.bak "s|const clash = |const reminder = null;\n  const clash = |" src/booking.js && rm src/booking.js.bak
ci marco "2026-09-14T10:00:00+0000" "refactor: prepare booking for extras"

cat >> tests/booking.test.js <<'EOF'

test('accepts repeat weekly', () => {
  const s = new Store();
  const b = create(s, cfg, { name: 'Di', start: '2026-11-02T11:00:00+01:00', repeat: 'weekly' });
  assert.ok(b.id);
});
EOF
ci marco "2026-09-21T15:00:00+0000" "feat: recurring bookings (wip)"

cat >> docs/usage.md <<'EOF'

## Recurring bookings

Pass `repeat: 'weekly'` (or `'daily'`) to book the same slot every week.

```js
create(store, cfg, { name: 'Ana', start: '2026-11-02T10:00:00+01:00', repeat: 'weekly' });
```
EOF
cat >> README.md <<'EOF'

## Recurring bookings

Weekly or daily repeats are supported through the `repeat` option.
EOF
ci marco "2026-09-22T09:00:00+0000" "docs: recurring bookings"

cat > docs/roadmap.md <<'EOF'
# Roadmap

| Item                    | Status |
|-------------------------|--------|
| Booking + availability  | done   |
| Email reminders         | done   |
| Recurring bookings      | done   |
| Persistence (database)  | todo   |
| Cancellation            | todo   |
EOF
ci aiko "2026-10-05T09:00:00+0000" "docs: roadmap"

cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.5.0 - 2026-10-12
- Email reminders 24 hours before appointments
- Weekly and daily recurring bookings

## 0.1.0 - 2026-08-14
- Booking creation, double-booking protection, free-slot calculation
EOF
sed -i.bak 's/"version": "0.1.0"/"version": "0.5.0"/' package.json && rm package.json.bak
ci aiko "2026-10-12T09:00:00+0000" "chore: release 0.5.0"

cat > src/cli.js <<'EOF'
const { load } = require('./config');
const { freeSlots } = require('./availability');

function run(argv, out = console.log) {
  const day = argv[0];
  if (!day) {
    out('usage: slotbook <YYYY-MM-DD>');
    return 1;
  }
  out(freeSlots(day, [], load()).join(' '));
  return 0;
}

module.exports = { run };
EOF
cat > bin/slotbook.js <<'EOF'
#!/usr/bin/env node
process.exitCode = require('../src/cli').run(process.argv.slice(2));
EOF
cat > tests/cli.test.js <<'EOF'
const test = require('node:test');
const assert = require('node:assert');
const { run } = require('../src/cli');

test('prints usage without a day', () => {
  const lines = [];
  assert.strictEqual(run([], (l) => lines.push(l)), 1);
  assert.match(lines[0], /usage/);
});

test('prints slots for a day', () => {
  const lines = [];
  assert.strictEqual(run(['2026-11-02'], (l) => lines.push(l)), 0);
  assert.match(lines[0], /09:00/);
});
EOF
ci noor "2026-10-19T10:00:00+0000" "feat: slot listing command"

cat >> docs/architecture.md <<'EOF'

The `slotbook` command prints the free slots of a day (`bin/slotbook.js`).
EOF
ci noor "2026-10-19T10:30:00+0000" "docs: mention CLI"

cat >> tests/tz.test.js <<'JSEOF'

test('crosses midnight', () => {
  const d = new Date('2026-11-02T23:30:00Z');
  assert.deepStrictEqual(localParts(d, 60), { hour: 0, minute: 30 });
});
JSEOF
ci marco "2026-10-20T09:00:00+0000" "test: tz midnight case"
