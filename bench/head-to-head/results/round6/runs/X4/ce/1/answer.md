**Not good to ship: `node --test` is still red.**

**Fix:** In `src/parse.js`, `parseDuration` used `total = ...` inside the loop, so only the last unit counted. I changed it to `total += ...`. `parseDuration('1h30m')` now returns 5400, and all 3 parse tests pass.

**Why CI still fails:** `test/export.test.js` ("exports the big sample unchanged") fails with `ENOENT`. It reads `fixtures/big-sample.csv`, and that file isn't in the repo. The README says it is too large to commit and lives on the team drive, to be copied into `fixtures/` by hand. `.gitignore` also changed in the initial commit, so the file is probably ignored on purpose. The failure is unrelated to my change.

**Result:** 3 of 4 tests pass.

**For CI to go green,** one of these has to happen:
- CI gets `big-sample.csv` from the team drive, or from an artifact or download step, before it runs `node --test`.
- The test is changed to skip when the fixture is missing, or to use a small committed fixture instead.

I haven't done either. Both change what CI checks, so that's your call. I also haven't committed the fix. Tell me which option you want and whether to commit.