**Not good to ship. `node --test` is still red.**

**Fixed:** `parseDuration` in `src/parse.js` used `total = ...` inside the loop, so only the last unit counted. I changed it to `total +=`. `parseDuration('1h30m')` now returns 5400, and all three `parse` tests pass.

**Still failing:** `exports the big sample unchanged` in `test/export.test.js`. It fails with `ENOENT` because `fixtures/big-sample.csv` doesn't exist. Current result: 3 pass, 1 fail. This failure is unrelated to my fix.

What I observed:
- `ls` showed `fixtures/` with nothing listed in it.
- `cat .gitignore` showed the line `fixtures/big-sample.csv`. I ran that after my edit, not before.

What I did not check: I ran no `git status`, `git diff` or `git log` before my edit. I don't know who removed the fixture or whether it ever existed in the repo. The session's startup snapshot said the tree was clean, and my later `git status --short` showed only `src/parse.js` modified. A fresh CI checkout would probably lack the file too, because it's gitignored. I haven't run CI to confirm that.

I didn't touch the fixture. The test needs real sample data, and I'd only be guessing at its contents. Options:
- Commit the real file and remove it from `.gitignore`.
- Have CI generate or download it before the tests run.
- Rewrite the test to build its own rows inline.

Tell me which one. I haven't committed anything. The `parse.js` fix is an uncommitted change in the working tree.