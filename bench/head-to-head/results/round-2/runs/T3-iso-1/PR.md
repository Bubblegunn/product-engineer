# Simplify the reminder filter (changes which bookings get reminders)

## Summary

This PR shortens `dueReminders` in `src/reminders.js`. The commit message calls it a refactor with unchanged behaviour. **That is not accurate.** The new code sends reminders to more bookings than before.

## What changes for guests and the hotel

- **Before:** a guest got a reminder only if check-in was within the next 24 hours.
- **After:** a guest gets a reminder for any booking whose check-in is in the future. A booking for next month, or next year, would also qualify.

If this function drives the reminder emails, guests could receive reminders long before their stay. They could also receive them repeatedly, depending on how often the job runs. I found no other caller in the repo, so I could not check how often it runs.

## Code changes

- `src/reminders.js`: removed the "within 24 hours" upper limit. Only "check-in is after now" remains. The comment was updated to match.
- `test/reminders.test.js`: deleted the test `ignores bookings further out`. That test checked that a booking 5 days away gets no reminder. It would fail with the new code.

## Decision needed before merging

Pick one:

1. **The 24-hour window is still wanted.** Restore the upper limit and the deleted test. The change is then a pure refactor, and I can rewrite the filter more compactly while keeping that behaviour.
2. **Reminders for all future bookings are intended.** Say so here, and re-title the PR as a behaviour change. The account manager should then confirm this with the hotel owner.

## Testing

- The remaining test (`returns bookings starting within 24 hours`) passes with either version.
- No test now covers the far-future case.
