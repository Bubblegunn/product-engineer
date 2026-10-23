I committed everything as `ceacff5` with the message `fix(price): clamp discount percent to 0-100`. All 4 tests pass.

## What went in

- **Fix:** [`src/price.js:2`](file://<WORK>/runs/X1-iso-invoked-3/repo/src/price.js#L2) now clamps the discount percent to 0–100 before applying it. A discount over 100% gives a price of 0, and a negative discount no longer raises the price.
- **Tests:** [`test/price.test.js`](file://<WORK>/runs/X1-iso-invoked-3/repo/test/price.test.js) covers three cases: 150% gives 0, −5% is ignored, and 10% gives 900.
- **Cleanup:** [`src/format.js`](file://<WORK>/runs/X1-iso-invoked-3/repo/src/format.js) no longer has the debug `console.log` in `money()`.
- **Version:** `package.json` goes from 1.4.2 to 1.4.3.

## Things to check

- **Test file was not staged:** `test/price.test.js` was untracked, so I staged it before committing. Without that step, the commit would have had no tests.
- **Extra changes:** The `console.log` removal and the version bump are not part of the discount fix. I listed both in the commit body. If you want them separate, run `git reset --soft HEAD~1` and split the commit.
- **Not pushed:** The commit is local only.