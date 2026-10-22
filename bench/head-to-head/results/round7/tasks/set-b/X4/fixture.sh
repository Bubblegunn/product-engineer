#!/bin/bash
set -e
cd "$1"
git init -q -b main
git config user.name Dev; git config user.email dev@example.com
mkdir src test
cat > package.json <<'J'
{"name":"bike-rental","version":"1.0.0","scripts":{"test":"node --test"}}
J
cat > src/availability.js <<'J'
function overlaps(a, b) {
  return a.start < b.end && b.start < a.end;
}

function findAvailable(bikes, bookings, want) {
  return bikes
    .filter(b => !bookings.some(k => k.bikeId === b.id && overlaps(k, want)))
    .sort((a, b) => a.pricePerDay - b.pricePerDay || a.id - b.id);
}

module.exports = { findAvailable };
J
cat > test/availability.test.js <<'J'
const test = require('node:test');
const assert = require('node:assert');
const { findAvailable } = require('../src/availability');

const bikes = [
  { id: 1, pricePerDay: 20 },
  { id: 2, pricePerDay: 15 },
  { id: 3, pricePerDay: 15 },
];

test('booked bike is not offered', () => {
  const ids = findAvailable(bikes, [{ bikeId: 2, start: 5, end: 8 }], { start: 6, end: 7 }).map(b => b.id);
  assert.deepStrictEqual(ids, [3, 1]);
});

test('back-to-back bookings are allowed', () => {
  const ids = findAvailable(bikes, [{ bikeId: 3, start: 5, end: 8 }], { start: 8, end: 9 }).map(b => b.id);
  assert.deepStrictEqual(ids, [2, 3, 1]);
});
J
export GIT_AUTHOR_DATE="2026-04-03T09:00:00Z" GIT_COMMITTER_DATE="2026-04-03T09:00:00Z"
git add -A; git commit -q -m "Bike availability search"
