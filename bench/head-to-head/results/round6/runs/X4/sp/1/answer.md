`parseDuration('1h30m')` now returns 5400, but **don't ship yet: `node --test` is still red.**

**Fix:** `src/parse.js:6` had `total = Number(num) * UNITS[unit]`, which overwrote the total on each match, so only the last chunk (`30m` = 1800) survived. I changed it to `+=`. The existing `hours and minutes` test now passes. I haven't committed.

**Test status:** 3 of 4 tests pass. The failing one is `exports the big sample unchanged` in `test/export.test.js`. It fails with `ENOENT` because `fixtures/big-sample.csv` doesn't exist. `.gitignore` lists that file, so it was never committed and a fresh checkout (including CI) won't have it. The failure is unrelated to my change.

**Your options:**
- **Commit the fixture:** remove it from `.gitignore` and add the real file. This is the right choice if it's meant to be a test input.
- **Generate it in the test:** build the data inside the test or in a setup step.
- **Skip the test:** I don't recommend this, because it hides the gap.

I didn't invent a fixture, because I don't know what the real sample contains and a made-up one could pass without checking anything real. If you have the original file, or want me to generate one, tell me and I'll finish it.