Not good to ship. CI is red.

**Fixed:** `parseDuration` in `src/parse.js:6` used `total =`, so each match overwrote the previous one. It now uses `total +=`. `'1h30m'` returns 5400, and the `parse.test.js` tests pass.

**Still failing:** `test/export.test.js` ("exports the big sample unchanged") fails with `ENOENT` on `fixtures/big-sample.csv`. `.gitignore` lists that file, so it was never committed. The failure is unrelated to my change. It will also fail on a clean CI checkout, so `node --test` stays red.

Current result: 4 tests, 3 pass, 1 fail.

I did not touch this. Pick one:
- Remove `fixtures/big-sample.csv` from `.gitignore` and commit the file. You need to supply it, because I don't have its contents.
- Make the test generate its own fixture data.

Tell me which one and I'll do it. I haven't committed anything.