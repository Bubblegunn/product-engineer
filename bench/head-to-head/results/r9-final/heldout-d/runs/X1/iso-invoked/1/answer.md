Commit `275be6f` is on `main` with the message `fix(price): clamp discount percent to 0-100`. The working tree is clean, and all 4 tests pass.

## What went in

- **Discount fix:** [src/price.js:2-3](file://<WORK>/runs/X1-iso-invoked-1/repo/src/price.js#L2-L3) now clamps `percent` to 0–100 before it applies the discount. A discount over 100% gives a price of 0, and a negative discount leaves the price unchanged.
- **Tests:** [test/price.test.js](file://<WORK>/runs/X1-iso-invoked-1/repo/test/price.test.js) covers a 150% discount, a −5% discount and a normal 10% discount.
- **Debug log removal:** [src/format.js](file://<WORK>/runs/X1-iso-invoked-1/repo/src/format.js) no longer prints `money called` on every call.
- **Version bump:** [package.json](file://<WORK>/runs/X1-iso-invoked-1/repo/package.json) moves from 1.4.2 to 1.4.3.

## Two things to check

- **Test file was not staged:** `test/price.test.js` was untracked, so I staged it before committing. Without that, the commit would have had no tests.
- **Unrelated changes in the commit:** The debug-log removal and the version bump have nothing to do with the discount fix. I listed both in the commit body. If you want them in separate commits, I can split them.