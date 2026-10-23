I've fixed the missing last page and committed it as `97f94cc`.

`pageCount` in `src/pager.js` used `Math.floor`, so 25 items gave 2 pages and the last 5 never showed. It now uses `Math.ceil`.

I added `test/pager.test.js` with two tests:
- **Page count:** 0 items gives 0 pages, 10 gives 1, and 25 gives 3.
- **Last page:** page 3 of 25 items holds the remaining 5.

`npm test` passes all 3 tests, including the existing format test. The commit message says the same.