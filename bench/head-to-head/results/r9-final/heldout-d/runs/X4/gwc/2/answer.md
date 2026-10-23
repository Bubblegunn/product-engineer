Fixed and committed (7d33191). `pageCount` in `src/pager.js` used `Math.floor`, which dropped the partial last page. It now uses `Math.ceil`, so 25 items gives 3 pages.

I added `test/pager.test.js`. It checks that 25 items give 3 pages, 20 give 2, 0 give 0 and 1 gives 1. It also checks that page 3 of 25 items holds the last 5. `npm test` passes all 3 tests (the new two plus the existing one), and the commit message lists what was tested.

I didn't run `src/export.js`, which calls `getPage`, directly.