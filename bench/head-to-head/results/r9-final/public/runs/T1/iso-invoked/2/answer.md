I committed the staged fix as `c223d2f` on `main`. I didn't run the tests. The working tree is clean.

- **Fix:** `dueReminders` in `src/reminders.js` now skips bookings with status `cancelled`.
- **Test:** `test/reminders.test.js` has a new test with one cancelled and one confirmed booking that share a check-in time. Only the confirmed booking should get a reminder.
- **Message:** The commit message follows the `fix(reminders): …` style of your earlier commits. It ends with the Co-Authored-By line.