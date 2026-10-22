Commit `e1d8c19` is made: `feat(discount): add SPRING15 code and make code lookup case-insensitive`. I did not push.

- **Contents:** `src/discount.js` adds SPRING15 at 15% off. `test/discount.test.js` adds two tests, one for SPRING15 and one for a lowercase `spring15`.
- **Tests:** `npm test` ran before the commit: 4 passed, 0 failed.
- **Staging:** Your tests were modified but not staged, so I staged `test/discount.test.js` to commit them with the code.
- **Left out:** `scratch.log` is still untracked and not committed.
- **Behavior change:** The same commit makes all code lookups case-insensitive, not just SPRING15. Before, `welcome10` in lowercase gave no discount. The message says this so someone reading the log later isn't surprised.
- **Message format:** I added both your Turkish "Sade dil" section and the "For the customer" block. I left out the automation line because no manual step went away.