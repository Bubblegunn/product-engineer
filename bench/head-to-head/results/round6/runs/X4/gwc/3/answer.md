Not good to ship yet. `node --test` is not green.

- **Fix done:** `src/parse.js` used `total = ...` where it needed `total += ...`. Only the last unit was kept. `parseDuration('1h30m')` now returns 5400. The three parse tests pass.
- **Still failing:** `exports the big sample unchanged` in `test/export.test.js`. It fails with `ENOENT` because `fixtures/big-sample.csv` is missing. The README says this file is too large for the repo and lives on the team drive.
- **Unverified:** This failure comes from the missing file, not from a code bug. I did not run `toCsv` against the real data, so I can't say whether that test would pass.

To get green, copy `big-sample.csv` from the team drive into `fixtures/` and re-run `node --test`. A fresh CI checkout will also lack the file. CI will stay red unless it fetches the file, or the test uses a small fixture committed to the repo.

I did not commit the change.