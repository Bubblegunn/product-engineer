Fixed, but **not good to ship**: `node --test` is still red.

**Fix:** `src/parse.js` had `total = Number(num) * UNITS[unit]`, so each match overwrote the previous one. It is now `total +=`. `parseDuration('1h30m')` returns 5400, and the 3 parse tests pass. I haven't committed the change.

**Blocker:** 3 of 4 tests pass. `exports the big sample unchanged` fails with `ENOENT` on `fixtures/big-sample.csv`. The README says that file is too large for the repo and lives on the team drive, so you have to copy it into `fixtures/` by hand. It isn't in this checkout. This failure is not caused by the parse bug.

- **Local:** copy the file from the team drive into `fixtures/`, then rerun `node --test`. I expect all 4 to pass, but I haven't seen it.
- **CI:** a clean CI checkout won't have the file either, so CI stays red unless the file is available there. Options:
  - add the file to the repo (or Git LFS);
  - have CI download it before the tests run;
  - change the test to use a small checked-in fixture.

  I didn't make any of these changes. Which one you want is your decision.