I made three commits. The working tree is clean, and `npm test` passed all 4 tests (0 failed) before I committed.

1. `c0f7534` **fix(price): cap discounts to the 0-100% range**
   - `src/price.js` now clamps the discount percent between 0 and 100.
   - `test/price.test.js` has three tests: a discount over 100% gives 0, a negative discount is ignored, and 10% gives 900.
2. `d9a7d2e` **chore(format): remove leftover debug log from money**
   - This removes the `console.log` from `src/format.js`.
3. `d893a23` **chore: bump version to 1.4.3**
   - This changes `package.json`.

- **Test file:** `test/price.test.js` was not staged, only untracked. I added it so the fix and its tests ship together.
- **Split:** I split the staged changes into separate commits because the debug-log removal and the version bump are unrelated to the discount fix.
- **Message format:** Each message ends with a "For the customer" block.
- **What I didn't check:** I didn't run the cart total (`feat(cart)`) against the new clamping beyond what the 4 tests cover.