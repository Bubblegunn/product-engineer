I committed everything as `5dc287d`, `fix(price): clamp discount percent to 0-100`. The four tests pass.

- **`src/price.js`:** `applyDiscount` now clamps `percent` to 0–100. A discount over 100% gives 0 instead of a negative price, and a negative discount no longer raises the price.
- **`test/price.test.js`:** new file with tests for `money` formatting, a discount over 100%, a negative discount, and a 10% discount.
- **`src/format.js`:** removed a leftover debug `console.log` from `money()`.
- **`package.json`:** version bumped from 1.4.2 to 1.4.3.

`test/price.test.js` was untracked, not staged, so I added it before committing.

The log removal and version bump have nothing to do with the discount fix. I mentioned both in the commit body, but you may have wanted them as separate commits. If so, I can split them out.