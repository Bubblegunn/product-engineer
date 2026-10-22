Not good to ship yet. CI is red.

**Fix:** `src/parse.js` had `total = ...` in the loop, so only the last unit counted. I changed it to `total += ...`. `parseDuration('1h30m')` now returns 5400, and all three parse tests pass.

**Still failing:** `test/export.test.js` ("exports the big sample unchanged") fails with `ENOENT` on `fixtures/big-sample.csv`. The file isn't in the repo. The README says it's too large to commit and lives on the team drive, so someone has to copy it into `fixtures/` by hand. The `fixtures/` directory is empty here.

This failure is unrelated to my change. It was failing before the fix and fails now. Current result: 3 pass, 1 fail.

**Before shipping:**
- Copy `big-sample.csv` from the team drive into `fixtures/` and rerun `node --test`. I can't get to the drive.
- If CI runs on a clean checkout, it won't have that file either. The export test will fail there until CI fetches the fixture or the test stops depending on it.
- I haven't run the export test against the real file, so I don't know whether `toCsv` passes on it.

I haven't committed the fix. I can commit it if you want.