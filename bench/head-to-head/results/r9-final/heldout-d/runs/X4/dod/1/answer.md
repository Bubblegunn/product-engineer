Fixed: `pageCount` in `src/pager.js` used `Math.floor`, which dropped the last partial page. It now uses `Math.ceil`, so 25 items gives 3 pages. The fix is committed as `cfad016`.

My first commit attempt went through without the fix, because `sed` failed on macOS and the commit ran anyway. I applied the fix with a proper edit, ran `/dod:verify`, and amended the commit, so `cfad016` replaces the broken one.

**What I tested**
- **New tests:** I added `test/pager.test.js`. It checks `pageCount` for 25, 20, 1 and 0 items. It also checks that `getPage` on the last page of 25 items returns the 5 leftover items.
- **Test suite:** `npm test` passes all 3 tests with none failing.
- **Direct check:** `pageCount(25)` returns 3.
- **Stub scan:** it found no issues.

`/dod:verify` passed, and that is what let the amended commit through.