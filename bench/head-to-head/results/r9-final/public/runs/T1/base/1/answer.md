I committed your staged fix as `610be62` on `main`: "fix(reminders): skip cancelled bookings in stay-starts-tomorrow email". I didn't run the tests.

The commit has two changes:
- **Fix:** `dueReminders` in `src/reminders.js` now returns early for bookings with `status === "cancelled"`.
- **Test:** a new case in `test/reminders.test.js` checks that a cancelled booking is skipped and a confirmed one with the same check-in time is still reminded.