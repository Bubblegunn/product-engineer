I committed the staged fix as `e70e589` on `main`: "fix(reminders): skip cancelled bookings in stay-starts-tomorrow email". I didn't run the tests.

The commit has two changes:
- **Fix:** `dueReminders` in `src/reminders.js` now skips bookings whose status is `cancelled`.
- **Test:** a new test in `test/reminders.test.js` checks that a cancelled booking gets no reminder and a confirmed one with the same check-in time still does.