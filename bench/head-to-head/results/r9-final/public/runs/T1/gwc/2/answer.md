I committed the staged fix as `4a3d995` on `main`. I didn't run the tests.

The commit has two changes:
- **Fix:** `dueReminders` in `src/reminders.js` now skips bookings whose status is `cancelled`.
- **Test:** `test/reminders.test.js` has a new test with one cancelled and one confirmed booking, checking that only the confirmed one gets a reminder.

I wrote the commit message myself and ended it with the Claude co-author line.