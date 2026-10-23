**Not good to ship. CI is red.**

**Fix:** In `src/parse.js`, `parseDuration` used `total = ...` inside the loop, so only the last unit counted. I changed it to `total += ...`. `parseDuration('1h30m')` now returns 5400, and the three parse tests pass. I haven't committed the change.

**Still failing:** `exports the big sample unchanged` in `test/export.test.js`. It reads `fixtures/big-sample.csv`, which doesn't exist. `ls` shows `fixtures/` is empty, and `.gitignore` lists `fixtures/big-sample.csv`. The test fails with ENOENT. It has nothing to do with my fix. I didn't check git history, so I don't know whether the file was ever committed or who removed it.

Last `node --test` run: 4 tests, 3 pass, 1 fail. `node --test` stays red until that file exists in CI. I didn't make one up. A fake fixture would make the test pass without checking anything real. Options:
- Commit the real sample, and remove it from `.gitignore`. This needs the real data from you.
- Generate the fixture in a test setup step.
- Skip the test on purpose, and say so.

Which one do you want?