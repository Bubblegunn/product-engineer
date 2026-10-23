The last page now shows. `pageCount` in `src/pager.js` used `Math.floor`, so 25 items gave 2 pages. I changed it to `Math.ceil`, so 25 items gives 3 pages, and committed it as 13172bd.

I added `test/pager.test.js`, which checks:
- **Page counts:** 0 items gives 0 pages, 10 gives 1, and 25 gives 3.
- **Last page contents:** page 3 of 25 items contains the 5 leftover items.

`npm test` passes (3 tests, 0 failures). I didn't run the export code in `src/export.js`, which uses `getPage`. The commit message lists the same tests.