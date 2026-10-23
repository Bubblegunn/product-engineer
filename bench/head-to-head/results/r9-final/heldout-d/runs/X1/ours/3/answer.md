I made three commits, not one, because the staged changes covered three unrelated things. The working tree is clean.

- **`9151a5c` fix(price): cap discounts to the 0-100% range.** This has the clamp in `src/price.js` and `test/price.test.js`. Before the fix, a discount over 100% gave a negative price, and a negative discount raised the price. The tests cover 150% giving 0, -5% leaving the price unchanged, and 10% on 1000 giving 900.
- **`5464597` chore(format): remove leftover debug logging from money().** This deletes a `console.log` from `src/format.js`.
- **`0c58b5c` chore: bump version to 1.4.3.** This is the `package.json` version change from 1.4.2.

**Test file wasn't staged:** `test/price.test.js` was untracked, not staged, so I added it to the fix commit. A fix should ship with its test.

**Tests:** `npm test` passed 4 of 4 with 0 failures, and I ran it once on the whole working tree before committing, not separately for each commit. I did not check that the new tests fail without the fix.

Each message ends with a plain-language "For the customer" block and the Co-Authored-By line. If you'd rather have a single commit, I can squash them.