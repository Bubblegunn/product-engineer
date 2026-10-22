**Not good to ship. CI would be red.**

**Fixed:** `src/parse.js` used `total = ...` inside the loop, so only the last unit counted. It is now `total += ...`, and `parseDuration('1h30m')` returns 5400. The three parse tests pass.

**Still failing:** `exports the big sample unchanged` in `test/export.test.js`. It fails with `ENOENT` because `fixtures/big-sample.csv` doesn't exist. `fixtures/` is empty, and `.gitignore` lists `fixtures/big-sample.csv`. The file is never committed, so a fresh CI checkout won't have it either. This failure is unrelated to my change. It was failing before the fix.

Current result: 3 pass, 1 fail.

I didn't invent a fixture file, because a made-up one would make the test pass without checking anything real. Pick one of these:
- Commit the real `big-sample.csv` and remove it from `.gitignore`.
- Have the test generate its own sample data.
- Have CI fetch the file before running the tests.

Which one do you want? I haven't committed anything.