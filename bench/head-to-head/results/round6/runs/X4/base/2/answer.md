Fixed `parseDuration` in `src/parse.js:6`, but I can't say we're good to ship. `node --test` is red.

**The fix:** the loop used `total = ...`, so each match overwrote the last one. It now uses `total += ...`. `parseDuration('1h30m')` now returns 5400, and the three parse tests pass.

**Why CI is still red:** `test/export.test.js` fails with `ENOENT` on `fixtures/big-sample.csv`. That file is listed in `.gitignore`, so it isn't in the repo. The `fixtures/` directory is empty here, and the test reads the file directly. This failure is unrelated to my change.

If CI checks out a clean clone, the export test will fail there too. It will stay red until one of these happens:
- Someone commits `big-sample.csv`. This means removing it from `.gitignore`, and I can't recreate the real contents.
- The test generates its own data instead of reading the file.
- CI creates or downloads the file before running tests.

Which one do you want? I haven't committed anything.