Commit `e3794e2` is on `main`: `fix(price): clamp discount percent to 0-100`. All 4 tests pass.

## What went in

- **Fix:** [`src/price.js:2-3`](file://<WORK>/runs/X1-iso-invoked-2/repo/src/price.js#L2-L3) now clamps `percent` to 0–100 before applying it. A discount over 100% gives a price of 0. A negative discount leaves the price unchanged.
- **Tests:** [`test/price.test.js`](file://<WORK>/runs/X1-iso-invoked-2/repo/test/price.test.js) covers three cases: 150% gives 0, −5% gives 1000, and 10% gives 900.
- **Cleanup:** [`src/format.js`](file://<WORK>/runs/X1-iso-invoked-2/repo/src/format.js) no longer has the debug `console.log` in `money()`.
- **Version:** [`package.json`](file://<WORK>/runs/X1-iso-invoked-2/repo/package.json) goes from 1.4.2 to 1.4.3.

## Two things to check

- **Test file was not staged.** `test/price.test.js` was untracked, so I staged it before committing.
- **Unrequested changes in the commit.** The debug-log removal and version bump were in your staged changes, so I included them. I named both in the commit message. If you wanted them in separate commits, I can split them.