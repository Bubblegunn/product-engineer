I fixed the missing last page and committed it as `f213c55`. `pageCount` in `src/pager.js` rounded down, so 25 items gave 2 pages. It now rounds up, so 25 items give 3 pages and the last page holds the remaining 5.

I added `test/pager.test.js`. It checks the page count for 0, 10 and 25 items, and that page 3 of 25 items holds 5. `npm test` passes all 3 tests. With the fix temporarily reverted, the new page-count test fails.

I didn't run the app or the export code, which also uses `getPage`. The commit message lists what I tested and includes a short note for customers.