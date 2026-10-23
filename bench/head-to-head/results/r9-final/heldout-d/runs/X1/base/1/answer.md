I committed everything as `5094f32`, "fix(price): clamp discount percent to 0-100". All 4 tests pass.

**What went in:**
- **`src/price.js`:** `applyDiscount` now clamps the percent to 0–100. A discount over 100% gives 0 instead of a negative price, and a negative discount is ignored.
- **`test/price.test.js`:** new tests for a discount over 100%, a negative discount, and a normal 10% discount. There's also a `money` formatting test.
- **`src/format.js`:** removed a leftover `console.log('money called', …)` from `money()`.
- **`package.json`:** version bumped from 1.4.2 to 1.4.3.

**Two things to check:**
- **Test file wasn't staged:** `test/price.test.js` was untracked, not staged. I added it so the tests ship with the fix.
- **Extra changes in the message:** the debug-log removal and version bump aren't part of the discount fix. I mentioned them in the commit message. If you'd rather have them as separate commits, I can split it.