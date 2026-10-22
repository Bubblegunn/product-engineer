**Not good to ship: CI will be red.**

**Fix:** In `src/parse.js`, `parseDuration` used `total = ...` inside the loop, so only the last unit counted. I changed it to `total += ...`. `parseDuration('1h30m')` now returns 5400, and all three parse tests pass.

**Failing test:** `exports the big sample unchanged` in `test/export.test.js` still fails. It reads `fixtures/big-sample.csv`, and that file doesn't exist. The error is `ENOENT`. `.gitignore` excludes the file, so it was never committed, and the `fixtures/` directory is empty. A fresh CI checkout will fail the same way.

This failure has nothing to do with my change. I haven't touched it. Result: 3 of 4 tests pass, 1 fails.

To get green, you could do one of these:
- Commit a real sample file and remove it from `.gitignore`.
- Have the test create its own data, which is probably better.
- Have CI generate or download the file, if it's meant to be large.

I don't know what the sample is supposed to contain, so I didn't pick one. Tell me which option you want and I'll do it.

I haven't committed the parse fix.