I fixed the missing last page and committed it as `14448fe`. `pageCount` in `src/pager.js` used `Math.floor`, so 25 items gave 2 pages. It now uses `Math.ceil`, which gives 3.

I added `test/pager.test.js`. It checks that `pageCount` returns 0, 1 and 3 pages for 0, 10 and 25 items, and that page 3 of 25 items returns 5 items. `npm test` passes all 3 tests, including the existing one. The commit message says the same.

I didn't run the export path in `src/export.js` that calls `getPage`.