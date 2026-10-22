# Simplify the reminder filter (needs a decision before merge)

## Summary

This branch shortens `dueReminders` in `src/reminders.js`. The commit message says "behaviour unchanged", but **the behaviour does change**. Please read the next section before approving.

## What changes for guests and hotels

Before this branch, a booking got a reminder only if check-in was within the next 24 hours. This matches the README: "Sends guests a reminder email the day before they arrive."

After this branch, a booking gets a reminder if check-in is at any time in the future. The 24-hour limit is gone.

If reminders are sent each time this runs, a guest arriving next month would be picked up on every run until they arrive. That could mean repeated emails to guests, and it is not what the README promises. I could not find the code that calls `dueReminders` in this repository, so I can't say how often it runs or whether anything else prevents repeats.

## What changed in the code

- `src/reminders.js`: removed the 24-hour upper bound and updated the comment to match.
- `test/reminders.test.js`: deleted the test "ignores bookings further out". That test is the one that would have caught this change. The remaining test only checks a booking inside the 24-hour window.

## Recommendation

Restore the 24-hour limit. A shorter version that keeps the behaviour is:

```js
const end = now.getTime() + 24 * 60 * 60 * 1000;
return bookings.filter((b) => {
  const start = new Date(b.checkIn).getTime();
  return start > now.getTime() && start <= end;
});
```

Then restore the deleted test. If the wider window is intended, the README, the commit message and this description should say so, and the sending code should be checked for duplicate emails.

## Testing

I did not run the tests for this description. The existing test passes in principle, because its booking is inside the window. No test now covers bookings further out.
