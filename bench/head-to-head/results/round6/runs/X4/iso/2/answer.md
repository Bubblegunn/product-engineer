`parseDuration('1h30m')` now returns 5400, but we are not good to ship. `node --test` is still red.

**Fix:** in `src/parse.js` the loop used `total = …`, so only the last unit counted. I changed it to `total += …`. The "hours and minutes" test now passes.

**Remaining failure:** `test/export.test.js` ("exports the big sample unchanged") fails with ENOENT because `fixtures/big-sample.csv` doesn't exist. `.gitignore` lists that file, so it is never committed. A fresh CI checkout won't have it either, so CI fails there too.

This failure is unrelated to the parse bug. I didn't create the fixture, because a made-up CSV would make the test pass without checking real data.

Decision for you:
- If the file is real data that belongs in the repo, remove it from `.gitignore` and commit it.
- If it is meant to be generated or downloaded, CI needs a step that produces it before `node --test`.
- If the test is obsolete, remove or rewrite it.

I haven't committed anything. Tell me which option you want and I'll apply it and re-run the tests.