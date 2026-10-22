# Simplify the reminder filter (this changes behaviour — please read)

## Summary

`dueReminders` in `src/reminders.js` is now a one-line filter. The commit message says "behaviour unchanged", but **that is not accurate**: the change removes the 24-hour limit.

| | Before | After |
|---|---|---|
| Which bookings are returned | Check-in is after now **and within the next 24 hours** | Check-in is after now, **no matter how far away** |

## Impact

- The README says guests get a reminder email "the day before they arrive", and the email subject reads "Your stay starts tomorrow". With this change, a guest whose stay is weeks or months away would also be selected as due.
- If the sender runs on a schedule (for example daily), guests could get a "starts tomorrow" email far too early, and again on every later run.
- I haven't checked how the sender calls `dueReminders`. This repo only contains the filter and the mail text. So I can't say whether something downstream limits the list.

## Tests

I also deleted the test `ignores bookings further out`. It covered exactly this case: a booking five days away must not be returned. Only the "within 24 hours" test remains, and it still passes. So the suite no longer catches the change above.

## Recommendation

Don't merge as is. Either:

1. Restore the 24-hour upper bound and the deleted test, keeping only a tidier version of the filter. Or
2. If sending reminders for all future bookings is intended, say so explicitly. Then update the README and the email wording, and replace the deleted test with one that matches the new rule.

## For the hotel owner / account manager

If this had shipped unchanged, guests with far-off bookings could have received "your stay starts tomorrow" emails too early. Nothing is released yet.
