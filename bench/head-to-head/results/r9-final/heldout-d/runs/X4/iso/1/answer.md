I fixed the missing last page and committed it as `42756ba`. With 25 items you now get 3 pages instead of 2.

`pageCount` in `src/pager.js` divided the total by the page size and rounded down, so a partial last page was dropped. It now rounds up.

I added `test/pager.test.js` with two tests:
- **Page counts:** 0 items gives 0 pages, 10 gives 1, 25 gives 3, and 30 gives 3.
- **Last page:** with 25 items, the last page holds the final 5 items.

`npm test` passes all 3 tests, counting the existing `money` test. I didn't run the app or `src/export.js`, which is the only other file that uses the pager, so that path is untested. The commit message lists the same tests.