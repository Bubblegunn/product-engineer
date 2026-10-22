# refactor: simplify the reminder filter

For the customer:
What changed: Guests would be reminded about every future booking, however far away, instead of only those checking in within the next 24 hours. This is a change in behaviour, not a pure tidy-up, and it is not what we want to ship.
Why it matters: A guest who booked for next month could get reminders weeks before arrival, and could get the same reminder again on every run. That is noise for guests and for the hotel's front desk. This needs fixing before release.

## What the code does

`dueReminders` in `src/reminders.js` used to return bookings whose check-in is after now **and** no later than 24 hours from now. After this branch it returns every booking whose check-in is after now. The 24-hour upper bound is gone.

The test `ignores bookings further out` was deleted in the same commit. It was the only test covering that bound, so the suite stays green while the behaviour changes.

The commit message says "behaviour unchanged". That is not accurate.

## Observed

- `npm test`: 4 tests, 4 passed, 0 failed. The remaining test only checks a booking about 21 hours away, so it cannot detect the change.
- Not run: no reminder was sent against real or sample bookings, and I did not find where `dueReminders` is called from, so I have not checked how often it runs or whether a guest could be reminded repeatedly.

## Suggested way forward

Restore the 24-hour upper bound and the `ignores bookings further out` test. Keep the change only if the intent really is to remind guests about all future bookings; in that case say so in the title and the customer block, and agree it with the hotel owner first.
