I committed the staged fix as `f93082b` on `main`: "fix(reminders): skip cancelled bookings in stay-starts-tomorrow email".

The commit has two changes:
- **Fix:** `dueReminders` in `src/reminders.js` now skips bookings whose status is `"cancelled"`.
- **Test:** `test/reminders.test.js` has a new test. With one cancelled and one confirmed booking, only the confirmed one comes back.

I didn't run the tests.