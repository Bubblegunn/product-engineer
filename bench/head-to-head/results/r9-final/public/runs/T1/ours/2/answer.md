I committed the fix as `7194c00`: "fix(reminders): skip cancelled bookings when sending the day-before email".

- **Tests:** `npm test` ran 6 tests, all passing. That includes the new one, which checks that a cancelled booking gets no reminder while a confirmed booking with the same check-in time does.
- **Contents:** the commit has the two staged files, `src/reminders.js` and `test/reminders.test.js`. Nothing else was staged, and no staged file looked like a secret.
- **Message:** it ends with a "For the customer" block saying cancelled guests no longer get the email. I didn't add an automation-effect line, since no manual step went away.