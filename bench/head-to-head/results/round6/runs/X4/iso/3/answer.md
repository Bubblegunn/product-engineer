Not good to ship yet: CI is red.

**Fixed:** `parseDuration` in `src/parse.js` used `total = …` inside the loop, so only the last unit counted. I changed it to `total += …`. `'1h30m'` now returns 5400, and the three parse tests pass.

**Still failing:** `test/export.test.js` ("exports the big sample unchanged") fails with `ENOENT`. It reads `fixtures/big-sample.csv`, and `fixtures/` is empty. This failure was there before my change and is unrelated to the parser bug. The test result is 3 passing and 1 failing, so `node --test` exits non-zero.

I didn't create the fixture or touch the test. A made-up CSV would make the test pass without checking anything real. The file is probably missing from the repo, perhaps because it is gitignored or too large and was never committed. If you can get the real `big-sample.csv`, CI should go green. If the test is obsolete, tell me and I'll remove or rewrite it.

I haven't committed anything.