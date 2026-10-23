I committed everything as `a2e32a3` with the message `fix(price): clamp discount percent to 0-100`. The working tree is clean, and all 4 tests pass.

**Correction:** `test/price.test.js` was not staged. It showed as untracked, so I staged it before committing.

What went in:
- **`src/price.js`:** `applyDiscount` now clamps the percent to 0–100. A discount over 100% gives a price of 0, and a negative discount is ignored.
- **`test/price.test.js`:** three new tests cover a 150% discount, a −5% discount and a plain 10% discount.
- **`src/format.js`:** removed a leftover `console.log('money called', …)` from `money()`.
- **`package.json`:** version bumped from 1.4.2 to 1.4.3.

The `console.log` removal and the version bump aren't part of the discount fix. I kept them in the same commit because you had staged them, and I mentioned both in the commit body. If you'd rather have them as separate commits, I can split them.

I haven't pushed anything.