# Simplify the reminder filter, which also removes the 24-hour limit

**Purpose:** Explain what this change does to guest reminders, so reviewers can decide whether to merge it.
**Readers:** Reviewing developers first. The hotel owner's account manager second.
**Date:** 2026-10-22

## Summary

This change makes `dueReminders` shorter, but it does not leave behaviour unchanged. The commit message says it does. That is not correct.

- **Before:** A booking got a reminder only if check-in was within the next 24 hours.
- **After:** A booking gets a reminder if check-in is at any time in the future.

**Decision needed:** Restore the 24-hour limit, or confirm that reminders for all future bookings are intended. Until someone decides, we recommend not merging.

## What this means for guests and hotels

Guests could receive reminder emails long before their stay. A guest who booked for next month would qualify today. How often they would be emailed depends on how often the reminder job runs. This change does not show that schedule, so we have not assessed it.

The hotel owner did not ask for this change. The account manager may want to confirm that earlier reminders are acceptable to hotels.

## What changed in the code

The function `dueReminders` picks which bookings get a reminder. It takes a list of bookings and the current time (`now`).

- **Filter:** [`src/reminders.js` lines 2-4](src/reminders.js#L2-L4) no longer computes an end time 24 hours after `now`. It keeps every booking whose check-in is after `now`.
- **Comment:** The comment above the function now reads "Bookings whose check-in is after now get a reminder." It matches the new behaviour.
- **Test removed:** [`test/reminders.test.js`](test/reminders.test.js) no longer contains the test "ignores bookings further out". That test checked a booking five days away and expected no reminder. It would fail against the new code, so removing it hid the change.
- **Test kept:** The test "returns bookings starting within 24 hours" remains. It still passes, because a booking inside 24 hours is also in the future.

## How to fix it

To keep the original behaviour, restore the upper limit and the removed test. A shorter version is possible:

```js
function dueReminders(bookings, now) {
  const end = now.getTime() + 24 * 60 * 60 * 1000;
  return bookings.filter((b) => {
    const start = new Date(b.checkIn).getTime();
    return start > now.getTime() && start <= end;
  });
}
```

If all future bookings should get reminders, say so in the commit message and rename the test. Do not describe the change as a refactor.

## Testing

We did not run the tests for this description. We read the diff only. Run `node --test test/` before you merge. Whichever way you decide, add a test for a booking beyond 24 hours.
