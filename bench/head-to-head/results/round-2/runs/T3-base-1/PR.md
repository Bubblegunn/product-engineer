# Simplify the reminder filter (changes which bookings get a reminder)

## Summary

This PR shortens `dueReminders` in `src/reminders.js`. The commit message calls it a refactor with unchanged behaviour. **That is not accurate: the change alters which bookings are selected.** Please review it as a behaviour change.

## What changes

**Before:** a booking got a reminder only if check-in was in the future and no more than 24 hours away.

**After:** a booking gets a reminder if check-in is in the future, however far ahead. The 24-hour upper limit is gone.

## Impact

If reminders are sent from this function's output, guests could be reminded about every upcoming booking, including ones months away. Each run would also pick up the same bookings again. That means more emails, and possibly repeat emails to the same guest, until check-in passes.

I found no callers of `dueReminders` in this repo besides its test. Whatever sends the reminders is not visible here, so I can't say how often it runs or whether it de-duplicates.

## Tests

The test `ignores bookings further out` is deleted. It was the only test covering the 24-hour limit, so nothing now guards that rule. The remaining test, `returns bookings starting within 24 hours`, still passes. I did not run the suite for this description.

## Recommendation

Do not merge as a "no behaviour change" refactor. Either:

1. Restore the 24-hour window and the deleted test. A shorter form of the same logic is still possible. Or
2. If sending reminders for all future bookings is intended, say so in the commit message and PR title, and have the account manager confirm it with the hotel owner first.

## For the account manager

Guest-facing behaviour could change if this merges as is: guests might get reminder emails much earlier, or more often, than the current "within 24 hours of check-in" timing. Please confirm that is wanted before release.
