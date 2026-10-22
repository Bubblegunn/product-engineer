# Simplify the reminder filter (changes which bookings get reminders)

## Summary

This PR shortens `dueReminders` in `src/reminders.js`. The commit message calls it a refactor with unchanged behaviour, but **it does change behaviour**.

- **Before:** a booking got a reminder only if its check-in was in the next 24 hours (after now, and no later than now + 24h).
- **After:** a booking gets a reminder if its check-in is any time after now. The 24-hour upper limit is gone.

## What this means for the hotel

If this is merged and reminders are sent from `dueReminders`, guests with bookings weeks or months away would be treated as due for a reminder. Depending on how often the job runs, they could receive the same reminder repeatedly, long before their stay. Nothing else in the repo calls `dueReminders` yet, so no guest is affected today. The risk applies once the sending job is connected.

## Tests

I removed the test `ignores bookings further out`. It checked that a booking five days away gets no reminder, so it would fail against the new code. That means the remaining test suite no longer covers the 24-hour limit. I haven't run the tests.

## Decision needed before merge

Choose one:

1. **Keep the 24-hour window (recommended if the reminder is meant to go out the day before).** Restore the upper bound and the removed test. The code can stay compact, for example by checking `start > now && start <= now + 24h` in a single expression.
2. **Remind for all future bookings on purpose.** Then the commit message and description should say this is a behaviour change, and the owner or account manager should confirm it is wanted.

## Files changed

- `src/reminders.js`: simplified filter and updated comment
- `test/reminders.test.js`: removed the "further out" test
