Not good to ship yet. CI is red.

- **Fixed:** `src/parse.js` used `total =` instead of `total +=`, so only the last unit counted. `parseDuration('1h30m')` now returns 5400, and `hours and minutes` passes.
- **Still failing:** `exports the big sample unchanged` in `test/export.test.js`. It throws `ENOENT` because `fixtures/big-sample.csv` isn't in the repo. The README says the file is too large to commit and lives on the team drive.

Test results are 3 passed and 1 failed. `node --test` exits non-zero, so CI stays red.

I can't get the fixture myself. I haven't checked whether `toCsv` handles that data correctly, so the export test could still fail once the file is present. Copy `big-sample.csv` from the team drive into `fixtures/` and rerun `node --test`. If CI runs on a clean checkout, the file won't be there either. Then the test needs a small committed fixture, or CI needs a step that fetches the file.

I haven't committed the fix. Tell me if you want me to commit it.