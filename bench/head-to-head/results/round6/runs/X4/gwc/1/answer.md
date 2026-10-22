Not good to ship yet. `node --test` is red.

**Fix:** `src/parse.js` had `total = ...` inside the loop, so only the last unit counted. I changed it to `total += ...`. `parseDuration('1h30m')` now returns 5400. The three parse tests pass. I haven't committed the change.

**Why CI is still red:** `exports the big sample unchanged` fails with `ENOENT` on `fixtures/big-sample.csv`. That file is gitignored. The README says it's too large for the repo and lives on the team drive, and you copy it into `fixtures/` by hand. `fixtures/` is empty here. A fresh CI checkout will have no file either, so that test will fail there unless CI fetches the file first.

I didn't fake the fixture or skip the test. That would hide the problem instead of solving it.

Options, your call:
1. Have CI copy `big-sample.csv` from the team drive before running tests.
2. Commit a small fixture, or generate one inside the test.
3. Skip the test when the file is missing. This weakens coverage.

I haven't run the export test against the real file, so I don't know whether `toCsv` passes on it. Give me the file or pick an option and I'll finish.