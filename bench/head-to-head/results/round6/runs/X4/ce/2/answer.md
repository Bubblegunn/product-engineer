Bug fixed. Not good to ship: `node --test` is still red.

**Fix:** `src/parse.js` used `total = ...` inside the loop, so only the last unit counted. It is now `total += ...`. `1h30m` returns 5400. The 3 parse tests pass.

**Why CI is red:** `test/export.test.js` fails with `ENOENT` on `fixtures/big-sample.csv`. The README says this file is too large for the repo and lives on the team drive. The `fixtures/` directory is empty here and `.gitignore` excludes the file. A fresh CI checkout has no copy either, so the test fails there too. It has nothing to do with my change.

**To get green, pick one:**
- Make the fixture available to CI, for example by fetching it from the team drive in a CI step or using Git LFS.
- Make the test generate a small sample instead of reading the big file.
- Skip the test when the file is missing. This hides the gap, and I don't recommend it.

I haven't committed anything. Tell me which option you want. If you want the fix committed alone, say so.