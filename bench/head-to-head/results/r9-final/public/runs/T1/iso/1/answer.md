I committed the staged fix as `197270b` on `main`: "fix(reminders): skip cancelled bookings in stay-starts-tomorrow email".

The commit has two changes:
- **Fix:** `dueReminders` in `src/reminders.js` now skips bookings with status `cancelled`.
- **Test:** a new test in `test/reminders.test.js` checks that a cancelled booking gets no reminder and a confirmed one still does.

I didn't run the tests before committing.