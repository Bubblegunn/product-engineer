# Simplify the reminder filter (this changes behaviour)

## Summary

This PR shortens `dueReminders` in `src/reminders.js`. The commit message says "behaviour unchanged", but that is **not accurate**. The change removes the 24-hour limit, so the function now returns a different set of bookings.

## What changes for guests and the hotel

- **Before:** a booking got a reminder only if check-in was in the next 24 hours.
- **After:** a booking gets a reminder if check-in is at any time in the future. A guest who booked for next month would be included, not just a guest arriving tomorrow.

If reminders are sent each time this function runs, guests could get reminder emails far too early, and possibly repeatedly. I did not find any code in this repo that calls `dueReminders` (only the test does), so I could not check how often it runs or whether anything stops repeat sends.

## Other changes

- The comment above the function now says "after now" to match the new logic.
- The test "ignores bookings further out" is deleted. That test would fail with the new logic, and it was the only one covering the 24-hour limit. The remaining test only checks a booking that is inside the window.

## Decision needed before merging

Pick one:

1. **The 24-hour limit was not intended to go.** Restore the upper bound and the deleted test, and keep this as a pure refactor. I recommend this unless the product owner has asked for the new behaviour.
2. **Reminders for all future bookings is intended.** Then the PR title, commit message and tests should say so, with a test for the new behaviour. Someone should also check how often reminders are sent.

## Testing

I did not run the tests for this description. Based on the diff, the deleted test would fail against the new code, which is why it was removed.
