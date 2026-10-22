# Simplify the reminder filter (this changes which guests get reminders)

## Summary

This branch shortens `dueReminders`, the function that picks which bookings get a reminder. The commit message says "behaviour unchanged", but that is not correct. The new code sends reminders for every future booking, not only those starting within 24 hours.

**Decision needed:** Either restore the 24-hour limit (recommended), or confirm that reminders for all future bookings are intended.

## What changes for guests and hotel owners

- **Before:** A booking got a reminder only if check-in was after now and no more than 24 hours away.
- **After:** A booking gets a reminder if check-in is after now, however far away.
- **Effect:** A guest who booked a stay months ahead would be selected for a reminder as soon as the function runs. Guests could receive reminders too early, and could receive them repeatedly if the function runs on a schedule.

I found no other caller of `dueReminders` in this repository, so I could not check how often it runs or whether something else limits the results. Please check that before you decide.

## Code changes

- [`src/reminders.js`](src/reminders.js) (lines 1–4): The 24-hour end time and the upper-bound check are removed. Only `check-in > now` remains. The code comment now describes the new rule.
- [`test/reminders.test.js`](test/reminders.test.js): The test "ignores bookings further out" is deleted. It was the only test that checked the 24-hour limit, so no test now covers it.

The remaining test, "returns bookings starting within 24 hours", still passes, because it only checks a booking that is inside the window.

## Recommended fix

Restore the upper bound and the deleted test, and keep the shorter style if you like:

```js
const DAY_MS = 24 * 60 * 60 * 1000;

function dueReminders(bookings, now) {
  const start = now.getTime();
  return bookings.filter((b) => {
    const checkIn = new Date(b.checkIn).getTime();
    return checkIn > start && checkIn <= start + DAY_MS;
  });
}
```

## How I checked

I compared this branch with `main` by reading the diff. I did not run the test suite.
