I committed the staged fix as `a326ffe`: `fix(reminders): skip cancelled bookings in day-before email`. The working tree is clean, and I didn't run the tests.

- **Fix:** `dueReminders` in `src/reminders.js` now skips bookings with status `cancelled`.
- **Test:** `test/reminders.test.js` has a new case with one cancelled and one confirmed booking. It expects only the confirmed one back.

The message includes the `Co-Authored-By` line.