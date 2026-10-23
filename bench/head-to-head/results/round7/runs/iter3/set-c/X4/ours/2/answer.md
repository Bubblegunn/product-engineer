Not good to ship yet. CI is red.

**Fixed:** `parseDuration` in `src/parse.js` used `total = ...` instead of `total += ...`, so only the last unit counted. `1h30m` now returns 5400. The three tests in `parse.test.js` pass.

**Still failing:** `exports the big sample unchanged` in `test/export.test.js`. It reads `fixtures/big-sample.csv`, which is missing. The file is gitignored. The README says it lives on the team drive and must be copied in by hand.

- A clean CI checkout will not have that file, so `node --test` fails there too, whatever my fix does.
- This failure is unrelated to the parse bug. I did not check whether `toCsv` passes on the real file, because I do not have it.

To get green, pick one:
1. Put the file on CI by some way other than git (artifact download or similar).
2. Commit a small fixture and point the test at it.
3. Skip the test when the file is missing. This hides the coverage gap.

I did not commit anything. Tell me which option you want, or whether I should commit the parse fix alone.