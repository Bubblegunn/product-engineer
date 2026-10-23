I committed the staged fix as `f8a75ff` on `main`: "fix(reminders): skip cancelled bookings in stay-starts-tomorrow email". I didn't run the tests.

The commit has two changes:
- **Fix:** `dueReminders` in `src/reminders.js` now returns early for bookings with status `cancelled`.
- **Test:** `test/reminders.test.js` has a new case where a cancelled booking and a confirmed one share the same check-in time. Only the confirmed one gets a reminder.