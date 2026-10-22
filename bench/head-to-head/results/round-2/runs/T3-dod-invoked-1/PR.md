# Simplify the reminder filter (`dueReminders`)

## Summary

This branch rewrites `dueReminders` in `src/reminders.js` as a one-line filter. **It is not behaviour-neutral, despite the commit message ("behaviour unchanged").** The change removes the 24-hour upper bound.

| | Before | After (this branch) |
|---|---|---|
| Which bookings get a reminder | Check-in is in the future **and** within the next 24 hours | Check-in is in the future, **no matter how far out** |

## What this means for hotels and guests

If this ships as is, a guest with a booking next month would be treated as due for a reminder today. That would likely mean early, repeated or mistimed reminder emails, depending on how often the reminder job runs. Hotel owners could see guests receive reminders long before arrival.

## Tests

- The test `ignores bookings further out` was **deleted** in this branch. It is the test that covers the 24-hour limit.
- The suite passes (`npm test`, exit code 0, 4 tests, 0 failures). Only one reminder test is left, and it doesn't cover the removed behaviour, so a green suite says nothing about the limit.

## Verification evidence

Probe: a booking 5 days after `now` (`2026-10-20T12:00Z`, check-in `2026-10-25T09:00Z`).

```
$ node -e "...dueReminders([{id:2,checkIn:'2026-10-25T09:00:00Z'}], now).map(b=>b.id)"
[ 2 ]      # on this branch: reminder is due (before: [])
```

The stub and empty-function scans found 0 issues.

## Recommended before merging

1. Restore the `start <= now + 24h` condition, or confirm that dropping it is intended and rename the commit and PR so they don't call it a refactor.
2. Restore the `ignores bookings further out` test.
3. Re-run `npm test` and the probe above.

## Status

DoD-Guard verify: **FAIL** (behaviour change, plus a test removed to get there).
