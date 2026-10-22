# Simplify the reminder filter (this changes behaviour)

## Summary

This PR shortens `dueReminders` in `src/reminders.js`. The commit message says "behaviour unchanged", but that is not accurate. **The change removes the 24-hour limit, so reminders would go out for every future booking.**

## What changes

- **Before:** a booking got a reminder only if check-in was after now and no more than 24 hours away.
- **After:** a booking gets a reminder if check-in is after now, however far away it is.

For example, with the current time at 20 Oct, a booking checking in on 25 Oct was not reminded before. With this branch it is. A guest who booked months ahead would be reminded straight away, and again on every later run. The code does not track which reminders were already sent, so I can't say from this diff how often that would happen.

## Tests

I also deleted the test `ignores bookings further out`. It was the only test that covered the 24-hour limit. The remaining test only checks a booking inside the window, so the suite passes with or without the limit. I haven't run the suite.

## Recommendation

Don't merge as it stands. There are two options:

1. **Keep the limit.** Restore the upper bound and the deleted test. The filter can still be shortened, for example by comparing `start > now && start <= end` inline.
2. **Drop the limit on purpose.** Then the PR should say so, the comment and test name should match, and the hotel owner should agree to guests being reminded about bookings far in the future.

## For the account manager

If this merged unchanged, guests could start getting booking reminder emails well before their stay, possibly repeatedly. The intended behaviour is one reminder in the 24 hours before check-in.
