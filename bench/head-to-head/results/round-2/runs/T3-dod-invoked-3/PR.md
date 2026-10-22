# Simplify the reminder filter (`dueReminders`)

## Summary

This branch rewrites `dueReminders` in `src/reminders.js` as a one-line filter and removes the test that covered bookings further out than 24 hours.

**This is not a pure refactor. It changes behaviour.** The commit message says "behaviour unchanged", but that is not accurate.

## What changes for hotels and guests

- **Before:** a guest got a reminder only if check-in was in the next 24 hours.
- **After:** a guest gets a reminder for any booking with a check-in in the future, however far away.

In practice, once reminders are sent, guests could be messaged about stays weeks or months away. That would likely repeat on every run. Hotel owners may see this as spam to their guests.

## Evidence

Probe: `dueReminders` called with now = 2026-10-20 12:00Z and a booking checking in 2026-10-25 09:00Z (5 days out).

- On `main`: returns `[]`, so no reminder.
- On this branch: returns `[2]`, so a reminder is due.

## Tests

`npm test` passes with 4 passed, 0 failed, 0 skipped (exit code 0). The pass is misleading. The test `ignores bookings further out` was deleted in this branch, and that test is the one that would have caught the change. Deleting it breaks the project's Definition of Done ("no existing test deleted to make the suite green").

## DoD-Guard verify

- Stub and empty-function scan: 0 issues.
- Tests: 4 passed, 0 failed.
- Verdict: **FAIL**, because the behaviour changed and a test was removed.

## Before merging

Restore the 24-hour upper bound and the `ignores bookings further out` test. Keep the simplification only if it preserves that bound. Otherwise, if the wider window is intended, say so explicitly, get sign-off from the product side, and add a test for the new rule.
