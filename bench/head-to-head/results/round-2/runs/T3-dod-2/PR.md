# Simplify the reminder filter

## Summary

This branch rewrites `dueReminders` in `src/reminders.js` as a single-line filter. **It is not behaviour-neutral, despite the commit message ("behaviour unchanged").** It removes the 24-hour limit on reminders.

## What changes for guests and the hotel

- **Before:** a guest gets a reminder only if check-in is in the future and within the next 24 hours.
- **After:** a guest gets a reminder for any booking with a future check-in. That includes bookings weeks or months away.

If the reminder job runs regularly, guests could get reminders about stays that are far off. They could also get repeat reminders. I did not check how the job is scheduled or whether it deduplicates. The caller of `dueReminders` was not part of this diff.

## Tests

- I removed the test `ignores bookings further out`. It is the only test that checks the 24-hour limit, and it would fail against the new code.
- With it gone, the remaining test (`returns bookings starting within 24 hours`) passes, but nothing now guards the upper bound.
- `npm test`: 4 tests, 4 passed. This result doesn't show the behaviour is unchanged, because the test that would catch the difference was deleted.

## Decision needed before merge

Pick one:

1. **Keep the 24-hour window (recommended if the change was meant to be a pure refactor).** Restore the upper bound and the deleted test. The simplification can stay as long as it keeps the window.
2. **Reminders for all future bookings are intended.** Then this is a feature change. Update the comment and the test name, add a test for the new rule, and confirm the product impact with the hotel owner.

## Not done

- No end-to-end run of the reminder job.
- No check of how often the job runs.
