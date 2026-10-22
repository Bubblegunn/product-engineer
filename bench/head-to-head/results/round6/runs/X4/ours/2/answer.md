Bug fixed. **Not good to ship: `node --test` is red.**

- **Fix:** `src/parse.js` used `total = ...` inside the loop, so only the last unit counted. I changed it to `total += ...`. `parseDuration('1h30m')` now returns 5400, and the three parse tests pass.
- **Failing test:** `exports the big sample unchanged` in `test/export.test.js` fails with `ENOENT`, because `fixtures/big-sample.csv` doesn't exist. Per the README, that file is too large for the repo and lives on the team drive, so you have to copy it into `fixtures/` by hand. It's missing here. The failure is unrelated to my change.
- **Totals:** 4 tests, 3 pass, 1 fails.

I haven't seen that export test pass, so I don't know whether `toCsv` handles the real sample. If CI also lacks the fixture, it will stay red until the file is available there. Options are to fetch the file into CI, commit it (e.g. with Git LFS), or change the test to use a small checked-in fixture. I haven't done any of these and haven't committed anything.