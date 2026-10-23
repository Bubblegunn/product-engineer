The last page now shows. I committed the fix as `2a0a296`.

## Cause
`pageCount` in [pager.js:3](file://<WORK>/runs/X4-iso-invoked-2/repo/src/pager.js#L3) used `Math.floor(total / size)`. That dropped any partial page, so 25 items gave 2 pages and hid the last 5.

## Fix
I changed `Math.floor` to `Math.ceil` on that line.

## What I tested
I added [pager.test.js](file://<WORK>/runs/X4-iso-invoked-2/repo/test/pager.test.js) and ran `npm test`. All 3 tests pass: the 2 new ones and the existing `money` test. I did not run the app or `src/export.js`, which calls `getPage`.

- **Page counts:** 25 items give 3 pages, 20 give 2, 1 gives 1, and 0 gives 0.
- **Short last page:** with 25 items, page 3 returns 5 items.