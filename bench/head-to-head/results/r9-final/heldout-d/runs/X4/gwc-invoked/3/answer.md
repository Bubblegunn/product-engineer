I fixed the missing last page and committed it as `e6943b3`. Tests pass: `npm test` ran 3 tests with 0 failures.

**Cause:** `pageCount` in `src/pager.js` used `Math.floor`, so 25 items gave 2 pages and the last 5 items were never shown. It now uses `Math.ceil`.

**Tests:** I added `test/pager.test.js`. It checks that `pageCount` returns 3, 2, 1 and 0 for 25, 20, 1 and 0 items. It also checks that page 3 of 25 items returns the remaining 5. The existing money test still passes.

The commit message lists these tests. I didn't produce a weekly changelog. The skill is for summarizing git history, and you asked for a bug fix.