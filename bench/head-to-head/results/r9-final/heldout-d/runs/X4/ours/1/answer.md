I fixed the missing last page and committed it as `d29d9ec`. 25 items now give 3 pages instead of 2.

`pageCount` in `src/pager.js` rounded down (`Math.floor`), so any leftover items past the last full page were unreachable. It now rounds up (`Math.ceil`).

**What I tested:**
- **New tests:** I added `test/pager.test.js`. It checks page counts for 0, 10, 25 and 30 items, and that page 3 of 25 items holds the last 5.
- **Full suite:** all 3 tests pass with `npm test`.
- **Without the fix:** I reverted the fix temporarily and the page-count test failed, so it does catch this bug.
- **Not tested:** I didn't run `src/export.js` end to end or any UI. The commit message says so.

The commit message also has a short "For the customer" note.