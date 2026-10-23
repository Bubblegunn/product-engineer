Fixed and committed (e72f960). `pageCount` in `src/pager.js` used `Math.floor`, so a partial last page was dropped. It now uses `Math.ceil`, so 25 items gives 3 pages.

I added `test/pager.test.js`, which checks:
- **Page counts:** 0 items gives 0 pages, 10 gives 1, and 25 gives 3.
- **Last page:** page 3 of 25 items returns the 5 remaining items.

`npm test` passes all 3 tests, including the existing `money` test. The commit message says the same.

I didn't run the export path, which calls `getPage` in `src/export.js`.