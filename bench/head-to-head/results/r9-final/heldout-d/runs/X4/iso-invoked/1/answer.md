The last page now shows. 25 items give 3 pages, and I committed the fix.

## Cause
`pageCount` in [pager.js:3](file://<WORK>/runs/X4-iso-invoked-1/repo/src/pager.js#L3) used `Math.floor(total / size)`. That drops a partial last page. I changed it to `Math.ceil`.

## What I tested
I added `test/pager.test.js` and ran `npm test`. All 3 tests pass: the new ones and the existing `money` test.

- **Page count:** 25 items give 3 pages, 20 give 2, 1 gives 1, and 0 gives 0.
- **Last page:** `getPage` on page 3 of 25 items returns the final 5 items, 20 to 24.

The page-count test failed before the fix (2 instead of 3). I did not run the app itself.

## Commit
The commit is `fix: round page count up so the last partial page shows`. My first attempt committed only the tests, because an edit command failed. I amended the commit, and it now holds both the fix and the tests.