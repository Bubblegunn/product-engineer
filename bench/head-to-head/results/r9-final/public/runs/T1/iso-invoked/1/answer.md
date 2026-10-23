I committed the staged fix as `ba0b35d`: `fix(reminders): skip cancelled bookings in day-before reminders`. I didn't run the tests.

- **Fix:** `dueReminders` in `src/reminders.js` now skips bookings with status `cancelled`, so those guests no longer get the "your stay starts tomorrow" email.
- **Test:** `test/reminders.test.js` has a new case with one cancelled and one confirmed booking. It expects only the confirmed one to be due.

The commit message ends with the Co-Authored-By line.