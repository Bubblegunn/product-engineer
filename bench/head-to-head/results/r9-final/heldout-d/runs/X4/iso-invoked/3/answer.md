I fixed the missing last page and committed it as `7d44a52`. 25 items now give 3 pages.

**Cause:** `pageCount` in [pager.js:3](file://<WORK>/runs/X4-iso-invoked-3/repo/src/pager.js#L3) used `Math.floor`, which drops a partly filled last page. I changed it to `Math.ceil`.

**What I tested:** I added `test/pager.test.js` and ran `npm test`. All 3 tests pass: the new two plus the existing `money` test.
- **Page counts:** 25 items give 3 pages, 20 give 2, 1 gives 1, and 0 gives 0.
- **Last page content:** with 25 items, page 3 holds the remaining 5.

I did not run the export path in `src/export.js`, which calls `getPage`. I also did not check the app itself.

My first commit attempt went in with the new tests but without the fix, because a `sed` command failed. I amended that commit, so the history has only the corrected version.