No, not good to ship. CI would be red.

**Fixed:** `parseDuration` in `src/parse.js` used `total =` where it needed `total +=`, so only the last unit counted. `'1h30m'` now returns 5400, and the three parse tests pass.

**Still failing:** `test/export.test.js` ("exports the big sample unchanged") fails with ENOENT. It reads `fixtures/big-sample.csv`, which doesn't exist. The file is listed in `.gitignore`, so it isn't in the repo and a clean CI checkout won't have it either. `node --test` is at 3 passed, 1 failed.

This failure was already there and is unrelated to my fix. I haven't touched it, because the right fix depends on what you want:
- Commit a small fixture and remove it from `.gitignore`.
- Have the test generate its own data.
- Add a CI step that creates the file, if it's meant to be a large generated file.

Tell me which one and I'll do it. I haven't committed anything.