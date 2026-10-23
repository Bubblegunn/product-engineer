I committed the fix as `ed116d0`. It changes `src/reminders.js` and `test/reminders.test.js`, and I left nothing out.

- **Fix:** `dueReminders` now skips bookings whose status is `cancelled`.
- **Test:** the staged change already had one. It checks that a cancelled booking and a confirmed one with the same check-in time produce a reminder only for the confirmed one.
- **Test run:** I ran `npm test` before committing and all 6 tests passed. I didn't send a real reminder email.
- **Message:** the commit message has the "For the customer" block and the Claude co-author line.