Not good to ship. `node --test` is still red.

**Fixed:** `parseDuration('1h30m')` now returns 5400. The bug was in `src/parse.js:6`. The loop used `total =` instead of `total +=`, so only the last match (`30m` = 1800) counted. The existing `hours and minutes` test failed before the fix and passes now. I made no other changes and haven't committed.

**Still failing:** `exports the big sample unchanged` in `test/export.test.js`. It fails with `ENOENT` because `fixtures/big-sample.csv` doesn't exist. The README says the file is too large for the repo and lives on the team drive, so someone has to copy it into `fixtures/` by hand. I don't have access to it. This failure is unrelated to the `parseDuration` bug.

Current result: 3 of 4 tests pass. To get green, either copy the fixture in, or decide how CI should get it. I didn't skip or stub that test, because that would hide a real gap. Once the fixture is present, I expect `node --test` to pass. I can't confirm that without the file, since I don't know whether `toCsv` matches its contents.