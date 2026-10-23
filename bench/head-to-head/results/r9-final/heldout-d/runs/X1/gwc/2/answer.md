I committed everything as `7f14248` with the message `fix(price): clamp discount percent to 0-100`. The working tree is clean and all 4 tests pass.

**What went in**
- **`src/price.js`:** `applyDiscount` now clamps the percent to 0–100. A discount over 100% gives 0 instead of a negative price, and a negative discount no longer raises the price.
- **`test/price.test.js`:** three tests cover a 150% discount giving 0, a -5% discount being ignored, and a normal 10% discount.
- **`src/format.js`:** the leftover `console.log('money called', …)` debug line is removed from `money()`.
- **`package.json`:** the version goes from 1.4.2 to 1.4.3.

**Things to check**
- The test file was not staged. It was untracked, so I added it to the commit.
- The `console.log` removal and the version bump were already in your staged changes, so I included them. I listed both in the commit body. If you'd rather have them in separate commits, I can split them out.