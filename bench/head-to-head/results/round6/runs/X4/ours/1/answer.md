`parseDuration('1h30m')` now returns 5400, but I can't say we're good to ship: `node --test` still fails, so CI would be red.

**Fix:** in `src/parse.js` the loop used `total = …` where it needed `total += …`. It only kept the last unit it matched, so `1h30m` gave 30 × 60 = 1800. The parse tests pass now.

**Still failing:** `test/export.test.js` ("exports the big sample unchanged") fails with `ENOENT` on `fixtures/big-sample.csv`. Current result is 3 pass, 1 fail.
- `.gitignore` lists `fixtures/big-sample.csv`, and `fixtures/` is empty here.
- The file isn't in the repo, so a fresh CI checkout will fail on that test the same way.
- This is unrelated to the duration bug, and I didn't touch it.

I didn't invent a fixture, because a made-up CSV would make the test pass without checking anything real. Pick one:
- Commit the real `big-sample.csv` and remove it from `.gitignore`.
- Have the test generate its own data.
- Skip the test on purpose.

I haven't committed anything. Tell me which option you want and I'll do it.