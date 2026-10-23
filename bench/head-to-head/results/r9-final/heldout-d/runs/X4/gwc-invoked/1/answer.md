I fixed the missing last page and committed it. 25 items now give 3 pages instead of 2.

`pageCount` in `src/pager.js` used `Math.floor`, which dropped any partial last page. I changed it to `Math.ceil`.

I added `test/pager.test.js`, which checks:
- **Page counts:** 0 items give 0 pages, 10 give 1, and 25 give 3.
- **Last page:** page 3 of 25 items returns 5 items.

`npm test` passes with all 3 tests (the new 2 plus the existing `money` test). I didn't test `src/export.js` end to end. It calls `getPage`, but nothing in the repo calls `pageCount`.

The commit message lists what I tested.

I invoked the git-weekly-changelog skill as you asked, but didn't produce a changelog. It only summarizes history, and you asked for a fix and a commit. I can write one if you want it.