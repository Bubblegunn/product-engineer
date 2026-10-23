I committed the staged fix as `066f958` on `main`: "fix(reminders): skip cancelled bookings in stay-starts-tomorrow email". I didn't run the tests.

The commit has two changes:
- **Fix:** `dueReminders` in `src/reminders.js` now returns false for bookings with `status === "cancelled"`.
- **Test:** `test/reminders.test.js` has a new case where a cancelled booking and a confirmed one both check in tomorrow, and only the confirmed one gets a reminder.