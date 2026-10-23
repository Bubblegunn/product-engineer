I committed everything as `2bf6487` on `main`: `fix(price): clamp discount percent to 0-100`. All 4 tests pass.

- **`src/price.js`:** `applyDiscount` now clamps the percent to 0–100. A discount over 100% gives a price of 0, and a negative discount no longer raises the price.
- **`test/price.test.js`:** 6 new lines. They cover a discount over 100%, a negative discount and a 10% discount.
- **`src/format.js`:** I removed a leftover debug `console.log` from `money()`.
- **`package.json`:** the version goes from 1.4.2 to 1.4.3.

- **Test file:** `test/price.test.js` was untracked, not staged. I staged it so the tests went in with the fix.
- **Unrelated changes:** the `console.log` removal and the version bump aren't part of the discount bug. I kept them because you'd staged them, and I named both in the commit message body. If you want them as separate commits, I can split them.

I haven't pushed anything.