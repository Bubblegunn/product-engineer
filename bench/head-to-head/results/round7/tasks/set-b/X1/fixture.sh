#!/bin/bash
set -e
cd "$1"
git init -q -b main
git config user.name Dev; git config user.email dev@example.com
mkdir src test
cat > package.json <<'J'
{"name":"vet-reminders","version":"1.0.0","scripts":{"test":"node --test"}}
J
cat > src/reminders.js <<'J'
const INTERVAL_MONTHS = { rabbit: 12, cat: 12, dog: 12, puppy: 1 };

function dueDate(lastShot, species) {
  const d = new Date(lastShot + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + INTERVAL_MONTHS[species]);
  return d.toISOString().slice(0, 10);
}

function remindersDue(patients, today) {
  return patients
    .filter(p => dueDate(p.lastShot, p.species) <= today)
    .map(p => p.name);
}

module.exports = { dueDate, remindersDue };
J
cat > test/reminders.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { dueDate, remindersDue } = require('../src/reminders');

test('cat booster is due a year later', () => {
  assert.strictEqual(dueDate('2025-03-10', 'cat'), '2026-03-10');
});

test('puppy booster is due a month later', () => {
  assert.strictEqual(dueDate('2025-05-15', 'puppy'), '2025-06-15');
});

test('remindersDue lists patients whose date has passed', () => {
  const patients = [
    { name: 'Biscuit', species: 'dog', lastShot: '2025-01-10' },
    { name: 'Pip', species: 'rabbit', lastShot: '2026-01-10' },
  ];
  assert.deepStrictEqual(remindersDue(patients, '2026-02-01'), ['Biscuit']);
});

test('reminders skip days the clinic is closed', { skip: 'TODO: Sunday closures not implemented' }, () => {
  assert.fail('not written yet');
});
J
export GIT_AUTHOR_DATE="2026-01-05T10:00:00Z" GIT_COMMITTER_DATE="2026-01-05T10:00:00Z"
git add -A; git commit -q -m "Add vaccine reminder dates"
export GIT_AUTHOR_DATE="2026-01-12T10:00:00Z" GIT_COMMITTER_DATE="2026-01-12T10:00:00Z"
echo "node_modules" > .gitignore; git add -A; git commit -q -m "Add gitignore"
