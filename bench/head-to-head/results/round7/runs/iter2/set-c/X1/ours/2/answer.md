Committed as `6b2e110`: `feat(discount): add SPRING15 code and make code lookup case-insensitive`. I didn't push.

- **Code:** I added SPRING15 at 15% off. The commit also covers a change you didn't mention: codes are now upper-cased before lookup, so `spring15` works. The message says so.
- **Tests:** The message lists your two tests, SPRING15 taking 15% off and case-insensitivity. `npm test` gave 4 passed, 0 failed, and the message records that.
- **Staging fix:** Your test file was modified but not staged, so I staged it. The commit has both `src/discount.js` and `test/discount.test.js`.
- **Left out:** `scratch.log` is still untracked and not committed.
- **Plain-language section:** I used the Turkish "Sade dil" format from your CLAUDE.md. I left out the automation-effect line because nothing manual was removed.