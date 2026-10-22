Fixed, but not good to ship: `node --test` is still red.

**Fix:** `src/parse.js` had `total = Number(num) * UNITS[unit]`, which overwrote the total on each match. It is now `+=`, so `parseDuration('1h30m')` returns 5400. The three parse tests pass.

**Why CI is red:** `test/export.test.js` fails with `ENOENT` on `fixtures/big-sample.csv`. The README says that file is too large for the repo and lives on the team drive, so it has to be copied in by hand. It is missing here. The failure is unrelated to the parse fix. The latest run shows 3 pass and 1 fail.

If CI is a fresh checkout, it won't have the fixture either, so it will fail there too. I did not touch that test and did not skip it or fake the fixture. That would hide the problem.

To get green, do one of these:
- Copy `big-sample.csv` from the team drive into `fixtures/`, then rerun `node --test`.
- Have CI fetch the fixture from the team drive before the tests run.
- Commit a small sample fixture for the test. This is your call.

I haven't committed anything. I also haven't added a regression test for multi-unit input like `1h30m45s`. The existing `1h30m` test already covers the bug, but I can add one if you want.