**Not good to ship yet: `node --test` is still red.**

**Fixed:** `parseDuration('1h30m')` now returns 5400. The loop in `src/parse.js` used `total = ...`, so each unit overwrote the last. I changed it to `total += ...`. The three `parse` tests pass, including `hours and minutes`.

**Still failing (1 of 4 tests):** `exports the big sample unchanged` in `test/export.test.js`.
- It fails with `ENOENT` because `fixtures/big-sample.csv` doesn't exist in this checkout.
- That file is gitignored. The README says it's too large for the repo and lives on the team drive, so someone has to copy it into `fixtures/` by hand.
- This failure is unrelated to my change. It failed before the fix too.

CI is `node --test` and must be green, so this blocks shipping. A CI runner without that file will fail the same way.

I didn't create a stand-in file. A fake fixture would make the test pass without checking anything real. Pick one:
1. Get the real `big-sample.csv` from the team drive and put it in `fixtures/`. I can then re-run and confirm green.
2. Make the CI environment provide the file, for example by downloading it from the drive.
3. Change the test to skip when the fixture is missing, or to use a small committed fixture. That's your call, since it changes what CI covers.

The fix in `src/parse.js` is uncommitted. I haven't committed anything.