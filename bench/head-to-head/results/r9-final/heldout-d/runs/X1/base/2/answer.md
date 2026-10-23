I committed everything as `7478449`, `fix(price): clamp discount percent to 0-100`. All 4 tests pass, including the 3 new ones.

- **`src/price.js`:** `applyDiscount` now clamps the percent to 0–100. A discount over 100% gives 0 instead of a negative price, and a negative discount no longer raises the price.
- **`test/price.test.js`:** This file wasn't staged; it was still untracked. I added it so the tests ship with the fix. It covers a 150% discount, a negative discount and a plain 10% discount.
- **`src/format.js`:** Removes a leftover `console.log('money called', …)` debug line from `money()`.
- **`package.json`:** Bumps the version from 1.4.2 to 1.4.3.

The debug-log removal and the version bump aren't part of the discount fix. I mentioned both in the commit body rather than splitting them out. If you'd rather have them as separate commits, I can redo it that way.