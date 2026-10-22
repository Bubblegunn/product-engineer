# Simplify the reminder filter (needs a decision before merge)

## Summary

This branch rewrites `dueReminders` in `src/reminders.js` as a single-line filter. The commit message says "behaviour unchanged", **but the behaviour does change**, and the change affects what guests receive.

## What changed

- **Before:** a booking got a reminder only if check-in was after now **and** within the next 24 hours.
- **After:** a booking gets a reminder if check-in is after now, with no upper limit.
- The test `ignores bookings further out` was deleted. It was the only test that covered the 24-hour limit.

## Why it matters

The README says guests get a reminder email "the day before they arrive". With this branch, `dueReminders` would return every future booking, including ones months away. If the caller runs on a schedule, those guests could be emailed repeatedly and far too early. I couldn't find a caller of `dueReminders` in this repo, so I can't tell how often it runs or whether something else limits it.

**For the hotel owner / account manager:** if this is merged as is, guests may receive reminder emails well before their stay, and possibly more than once. This is not the "day before" behaviour we describe to customers.

## Recommendation

Restore the 24-hour upper bound and the `ignores bookings further out` test. The filter can stay compact:

```js
const end = now.getTime() + 24 * 60 * 60 * 1000;
return bookings.filter((b) => {
  const t = new Date(b.checkIn).getTime();
  return t > now.getTime() && t <= end;
});
```

If dropping the limit is intended, for example because the limit moves to the caller, please say so here. The commit message and the comment on the function should then stop describing it as a no-op refactor.

## Testing

I did not run the tests. By reading the diff, the remaining test (a booking within 24 hours is returned) still passes. Nothing now checks that distant bookings are excluded.
