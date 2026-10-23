I committed the staged fix as `3c138b1` on `main`: "fix(reminders): skip cancelled bookings in stay-starts-tomorrow email". I didn't run the tests.

The commit has two changes:
- **`src/reminders.js`:** `dueReminders` now skips bookings with `status === "cancelled"`.
- **`test/reminders.test.js`:** a new test checks that a cancelled booking gets no reminder and a confirmed one still does.

I added the Co-Authored-By line for Claude to the commit message.