I committed everything as `eb19843`, `fix(price): clamp discount percent to 0-100`. All 4 tests pass.

- **`src/price.js`:** `applyDiscount` now clamps the percent to 0–100. A discount over 100% gives 0 instead of a negative price, and a negative discount is ignored instead of raising the price.
- **`test/price.test.js`:** this is new. It covers a discount over 100%, a negative discount, a 10% discount, and `money` formatting.
- **`src/format.js`:** I removed a leftover `console.log('money called', …)` from `money()`.
- **`package.json`:** the version goes from 1.4.2 to 1.4.3.

- **Test file wasn't staged:** `test/price.test.js` was untracked, so I staged it before committing.
- **Extra changes in the message:** the debug-log removal and the version bump aren't part of the discount fix, so I listed them in the commit body. If you'd rather have them as separate commits, I can split them.