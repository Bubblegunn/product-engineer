I committed your staged fix as `cd7fc25` on `main`: "fix(reminders): skip cancelled bookings in stay-starts-tomorrow email". I didn't run the tests.

The commit has two changes:
- **Fix:** `dueReminders` in `src/reminders.js` now skips bookings whose status is `cancelled`.
- **Test:** `test/reminders.test.js` has a new test with one cancelled and one confirmed booking, both checking in tomorrow. It expects only the confirmed one to be reminded.