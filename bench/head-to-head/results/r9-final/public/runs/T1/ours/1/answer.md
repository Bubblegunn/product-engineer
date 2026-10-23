I committed your fix as `002727d`: "fix(reminders): skip cancelled bookings when sending the day-before email".

- **Tests:** `npm test` ran before the commit and showed 6 passed, 0 failed. That includes the new test, "does not remind guests whose booking was cancelled".
- **Message:** It ends with a short "For the customer" note saying cancelled guests no longer get the "your stay starts tomorrow" email.
- **Left out:** Nothing. Only the two staged files, `src/reminders.js` and `test/reminders.test.js`, were in the commit, and the working tree is clean.

I didn't check that the real email job skips cancelled guests. I only ran the tests.