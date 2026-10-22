# refactor: simplify the reminder filter

For the customer:
What changed: Guests may now get a reminder email for any upcoming booking, however far away the check-in is, instead of only for stays starting in the next 24 hours. This is a change in behaviour, even though the commit is titled "behaviour unchanged".
Why it matters: A guest with a booking next month could be emailed a "your stay starts soon" reminder today, and could be emailed again every time reminders are sent. Please do not merge this until the team has decided that is intended; if it is not, the 24-hour limit needs to be put back.

## What the code does

`dueReminders` in `src/reminders.js` used to keep a booking only if its check-in was after now **and** no later than 24 hours from now. The branch removes the 24-hour upper limit, so every booking with a check-in in the future is kept.

The old comment ("next 24 hours") and the test `ignores bookings further out` were removed along with the limit. That test is the one that would have failed, so removing it is why the suite still passes.

## What I checked

- Ran `npm test`: 4 passed, 0 failed. This does not show the behaviour is unchanged, because the test that covered the 24-hour limit is deleted in this branch.
- Not run: I did not send any reminder or check how often `dueReminders` is called, so I cannot say how many extra emails would go out. I found no other caller of `dueReminders` in `src/`.

## Suggested way forward

Restore the `end` bound in `src/reminders.js` and the `ignores bookings further out` test, keeping any other tidy-up. If the wider window is wanted, rename the commit and describe it as a feature, and add a test for the new rule.
