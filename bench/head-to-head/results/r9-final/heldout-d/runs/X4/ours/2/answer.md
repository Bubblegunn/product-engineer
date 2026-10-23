I fixed the missing last page and committed it as `ec8e6d3`. 25 items now give 3 pages instead of 2.

`pageCount` in `src/pager.js` rounded down, so a partial last page was dropped. It now rounds up.

I added `test/pager.test.js`. It checks that 0 items give 0 pages, 10 give 1, and 25 give 3. It also checks that page 3 of 25 items holds 5 items. I ran `npm test` and all 3 tests passed. That count includes the existing money test in `test/format.test.js`.

I didn't run the export in `src/export.js` end to end, and I didn't run the new tests against the old code to see them fail. The commit message says the export wasn't run.