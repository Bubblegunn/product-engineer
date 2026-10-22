**Don't ship yet. `node --test` is not green.**

**Fixed:** `src/parse.js` used `total = ...` inside the loop, so only the last unit counted. I changed it to `total += ...`. `parseDuration('1h30m')` now returns 5400, and all 3 parse tests pass. I haven't committed the change.

**Still failing:** `test/export.test.js` ("exports the big sample unchanged") fails on the current tree, 3 pass and 1 fails:

```
ENOENT: no such file or directory, open '.../fixtures/big-sample.csv'
```

This failure is separate from the parse bug. `fixtures/big-sample.csv` is listed in `.gitignore`, so it isn't in the repo. A fresh CI checkout won't have it, so CI will fail the same way. I didn't check whether the test failed before my change, but the missing file has nothing to do with `parse.js`.

I didn't create the fixture, because I don't know what the real file contains. Pick one of these:
1. Commit the fixture. Remove it from `.gitignore` if it's small enough to commit.
2. Generate the fixture in a test setup step, or have CI fetch it.
3. Change the test to build its own sample data. `toCsv` is a one-liner, so this is probably enough.

Tell me which one and I'll do it and rerun `node --test`.