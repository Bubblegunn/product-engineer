Not good to ship. The `parseDuration` fix works, but `node --test` is still red.

- **Fix:** `src/parse.js` used `total = ...` where it needed `total += ...`, so only the last unit counted. `'1h30m'` now gives 5400. The three parse tests pass.
- **Failing test:** `exports the big sample unchanged` in `test/export.test.js` fails with ENOENT. It reads `fixtures/big-sample.csv`. That file is listed in `.gitignore` and is not in the repo. The `fixtures/` directory is empty.
- **CI impact:** a fresh CI checkout won't have the file, so the same test fails there.
- **Cause:** this failure is not from my change. The test depends on a file that isn't committed.

I left the test and `.gitignore` alone. Which of these do you want?
1. Commit the real `big-sample.csv`. This means removing it from `.gitignore`. I don't have the file, so you'd need to supply it.
2. Change the test to generate its own data inline.
3. Skip the test. I don't recommend this, because it hides a real gap.

I haven't committed anything.