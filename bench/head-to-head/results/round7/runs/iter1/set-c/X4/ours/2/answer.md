Fixed `parseDuration`, but **not good to ship: CI is red.**

**Fix.** `src/parse.js` used `total = ...` inside the loop, so only the last unit counted. It's now `total += ...`. `parseDuration('1h30m')` returns 5400. The three parse tests pass. I haven't committed the change.

**CI status.** `node --test` shows 3 passing and 1 failing. The failing test is `exports the big sample unchanged` in `test/export.test.js`. It fails with `ENOENT` because `fixtures/big-sample.csv` doesn't exist. This is unrelated to my change.

**What I checked about the missing file:**
- Before the edit, `ls` showed `fixtures/` is empty.
- After the edit, `.gitignore` contains the line `fixtures/big-sample.csv`. `git log --stat` shows the single commit has no file under `fixtures/`.
- I did not check whether the file ever existed or who removed it. Ignoring it in `.gitignore` is the likely reason it isn't in the repo, but that is my inference. A fresh CI checkout would probably fail the same way.

I can't recreate the file myself, because I don't know what the real sample contains. Options:
1. Restore the original `big-sample.csv` and remove it from `.gitignore` so it gets committed.
2. Have the test generate its own sample data instead of reading the file.

Which do you want? I can also add a regression test for multi-unit input like `1h30m45s`. The existing `1h30m` test already covers the bug.