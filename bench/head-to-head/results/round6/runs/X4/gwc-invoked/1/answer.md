**Not good to ship. `node --test` is red.**

**The fix:** `parseDuration('1h30m')` now returns 5400. In `src/parse.js`, the loop did `total = …`, so each match overwrote the previous one and only the last unit (`30m` = 1800) survived. I changed it to `total += …`. The three parse tests pass, including `hours and minutes`. I haven't committed it.

**What still fails:** `exports the big sample unchanged` in `test/export.test.js` fails with ENOENT. It reads `fixtures/big-sample.csv`, which doesn't exist. `fixtures/` is empty, and `.gitignore` lists `fixtures/big-sample.csv`, so the file is never committed. This failure is separate from the parse bug and was there before my change. Any clean checkout or CI run will fail the same way.

Options, your call:
- Commit a real sample file and remove the `.gitignore` entry.
- Have the test generate its own data instead of reading the file.

I haven't done either, because I don't know what `big-sample.csv` was meant to contain. If it's just a placeholder, I can write a small one. Tell me which option you want.

**Changelog (git-weekly-changelog skill):**
- Window: 2026-10-15 → 2026-10-22 23:16 +03, branch `main`.
- There are no commits in that window. The only commit is `54d02d6 Initial durations lib`, dated 2026-09-10.
- There is nothing to group, so I didn't write a changelog.
- The skill says read-only inspection only. I also ran `node --test`, because you asked whether CI would be green.