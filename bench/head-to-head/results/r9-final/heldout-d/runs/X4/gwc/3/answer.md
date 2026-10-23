Fixed and committed as `207b36b`. 25 items now gives 3 pages instead of 2.

`pageCount` in `src/pager.js` used `Math.floor`, which dropped any partial last page. I changed it to `Math.ceil`.

I added `test/pager.test.js`, which checks:
- **Page counts:** 0 items gives 0 pages, 10 gives 1, and 25 gives 3.
- **Last page:** page 3 of 25 items returns the final 5.

`npm test` passes all 3 tests with the fix. With the old `floor` code, the page-count test fails.

The commit message lists these tests. I only ran the unit tests and didn't run the export path in `src/export.js`, which calls `getPage`.