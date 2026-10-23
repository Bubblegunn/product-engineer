I committed it as `73118e4` with the message `fix(price): clamp discount percent to 0-100`. All 4 tests passed before I committed.

**What went in:**
- **`src/price.js`:** `applyDiscount` now clamps the percent to 0–100. A discount over 100% gives a price of 0 instead of a negative one, and a negative discount no longer raises the price.
- **`test/price.test.js`:** 6 new lines covering the over-100% case, the negative-discount case and a basic 10% case.
- **`src/format.js`:** removed a leftover `console.log('money called', …)` from `money()`.
- **`package.json`:** version bumped from 1.4.2 to 1.4.3.

**Things to check:**
- **Test file wasn't staged:** `test/price.test.js` was untracked, so I staged it before committing.
- **Unrelated changes:** the `console.log` removal and the version bump aren't part of the discount fix. I included them because they were staged, and I noted both in the commit body. If you'd rather have them as separate commits, I can split them out.

I haven't pushed anything.