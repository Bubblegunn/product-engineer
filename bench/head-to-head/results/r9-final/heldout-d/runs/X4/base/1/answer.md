Fixed and committed as `41ac4df`.

`pageCount` in `src/pager.js` used `Math.floor`, so 25 items gave 2 pages. It now uses `Math.ceil`, which gives 3.

I added `test/pager.test.js` and ran `npm test`. All 3 tests pass, including the existing format test. The new tests check:
- **`pageCount`:** 25 items give 3 pages, 20 give 2, 1 gives 1, and 0 gives 0.
- **`getPage`:** page 3 of 25 items returns the last 5 items.

I only ran the unit tests. I didn't try the export flow in `src/export.js` end to end.