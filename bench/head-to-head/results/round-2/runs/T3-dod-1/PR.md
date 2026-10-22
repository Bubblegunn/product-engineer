# Simplify the reminder filter (changes which bookings get reminders)

## Summary

This branch rewrites `dueReminders` in `src/reminders.js` as a one-line filter. **It is not behaviour-neutral, despite the commit message saying "behaviour unchanged".**

| | Before | After this branch |
|---|---|---|
| Bookings that get a reminder | Check-in is in the future **and within the next 24 hours** | Check-in is in the future, **with no upper limit** |

## What this means for the hotel

If `dueReminders` is run on a schedule, a guest with a booking months away would be eligible for a "your stay is coming up" reminder on every run, not only on the day before arrival. Guests could get early or repeated reminder emails.

The function currently has no caller in `src/`, so nothing is sent yet. The problem would appear as soon as it is wired into the mail flow.

## Changes

- `src/reminders.js`: removed the 24-hour upper bound. The comment now reads "check-in is after now".
- `test/reminders.test.js`: deleted the test `ignores bookings further out`. That test checked that a booking 5 days away gets no reminder, so it is the test that would have caught this change.

## Testing

`npm test`: 4 of 4 pass. The suite passes only because the test covering the 24-hour limit was removed. The one remaining reminder test checks a booking inside the window, which both versions satisfy.

No end-to-end check was run, because nothing calls `dueReminders` yet.

## Recommendation before merging

Restore the 24-hour upper bound and the `ignores bookings further out` test. The filter can still be written compactly:

```js
const end = now.getTime() + 24 * 60 * 60 * 1000;
return bookings.filter((b) => {
  const t = new Date(b.checkIn).getTime();
  return t > now.getTime() && t <= end;
});
```

If removing the limit is intended, say so in the commit message and add a test for the new rule.
