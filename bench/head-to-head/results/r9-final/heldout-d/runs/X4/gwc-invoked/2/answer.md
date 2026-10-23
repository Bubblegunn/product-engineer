I fixed the missing last page and committed it as `f4d08b9`.

**Cause:** `pageCount` in `src/pager.js` used `Math.floor(total / size)`, so 25 items gave 2 pages and the last 5 were unreachable. It now uses `Math.ceil`.

**Tested:**
- **New tests:** I added `test/pager.test.js`. It checks that `pageCount` returns 0, 1 and 3 for 0, 10 and 25 items. It also checks that page 3 of 25 items holds 5 entries.
- **Before the fix:** both new tests failed on the old code.
- **After the fix:** the full `npm test` run passes, 3 of 3 tests. The commit message says the same.

I didn't write a changelog. The git-weekly-changelog skill summarises history, and this task was a bug fix. The skill also says not to run tests, and you asked what I tested, so I ran them.