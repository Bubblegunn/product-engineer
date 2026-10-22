Commit `a3e2c42` is made: `feat(discount): add SPRING15 code and make code lookup case-insensitive`. Nothing was pushed.

- **What's in it:** `SPRING15` at 15% off, plus the change that upper-cases codes before lookup. That second change also applies to `WELCOME10` and `VIP20`, and I put it in the message body so the log shows it.
- **Tests:** The message mentions your two tests, "SPRING15 takes 15% off" and "codes are case-insensitive". `npm test` gave 4 passed, 0 failed, and that result is in the message.
- **Test file:** `test/discount.test.js` was modified but not staged, so I staged it and included it. Without it the commit would have had no tests.
- **Left out:** `scratch.log` is still untracked.
- **Message format:** I added the plain-language Turkish block from your CLAUDE.md. I left out the automation line because no manual step went away.