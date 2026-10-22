# Simplify the reminder filter (note: this changes behaviour)

## Summary

This PR shortens `dueReminders` in `src/reminders.js` to a one-line filter. The commit message says "behaviour unchanged", **but that is not accurate**. The diff removes the 24-hour upper limit.

## What changes for guests

- **Before:** a booking got a reminder only if check-in was in the future and within the next 24 hours.
- **After:** a booking gets a reminder if check-in is in the future, however far away. A guest who booked for next month would be due a reminder now.

If `dueReminders` runs on a schedule and feeds the reminder mail, guests could get reminders far too early. They could also get them repeatedly, once on every run. Nothing in this repo calls `dueReminders` yet, so I couldn't check how it is scheduled.

## Tests

I deleted the test `ignores bookings further out`. It covered exactly the case that changed, so the suite still passes but no longer checks the 24-hour limit.

## Decision needed before merging

Pick one:

1. **The 24-hour limit should stay (likely intent).** Restore the upper bound and the deleted test, and keep only the cosmetic cleanup. I can do this on request.
2. **The limit is meant to go.** Then this is a feature change, not a refactor. The commit message and the code comment should say so, and the account manager should confirm that reminders for far-future bookings are wanted.

## Files

- `src/reminders.js`: filter simplified (24-hour bound removed)
- `test/reminders.test.js`: "ignores bookings further out" test removed
