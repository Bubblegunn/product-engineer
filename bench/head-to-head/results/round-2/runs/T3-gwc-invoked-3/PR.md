# Simplify the reminder filter — needs a decision: it changes behaviour

**Analysis basis**

- Generated: `2026-10-22 05:06 +03`
- Branch: `refactor/reminder-filter` → `main`
- Range: 1 commit (2026-10-20), 2 files, +2 / −12
- Method: read-only git inspection. Tests were not run.

---

## Summary

This PR shortens `dueReminders` in `src/reminders.js`. The commit message says "behaviour unchanged", but **the diff changes behaviour**, so please don't merge it as a pure refactor.

## What changes for guests and hotels

- **Before:** a guest gets a reminder only if check-in is in the next 24 hours. This matches the README: "a reminder email the day before they arrive".
- **After:** a guest is due a reminder for **any** booking with a check-in in the future. That includes a booking made for next month.

If the reminder job runs on a schedule and sends mail to everyone `dueReminders` returns, guests could get reminders far too early, and possibly on every run. I could not find the scheduler or mail-sending code in this repo, so I can't say how often this would happen. That needs checking before merge.

## Code changes

- `src/reminders.js`: the 24-hour upper bound is removed, and the comment is updated to match.
- `test/reminders.test.js`: the test "ignores bookings further out" is deleted. It was the only test covering the upper bound. The remaining test only checks a booking that is 21 hours away.

## Recommendation

Restore the 24-hour upper bound and the "further out" test. The code can still be shortened without dropping the bound. If the new behaviour is intended, the README, the PR title and the commit message should say so, and the hotel owner should be told.

## Verification

- Tests were not run.
- The behaviour change comes from reading the diff.
