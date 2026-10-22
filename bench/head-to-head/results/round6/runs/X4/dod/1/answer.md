Not good to ship. CI would be red.

**Fixed:** `src/parse.js` had `total = ...` instead of `total += ...`, so only the last unit counted. `parseDuration('1h30m')` now returns 5400. The three parse tests pass.

**Still failing:** `test/export.test.js` ("exports the big sample unchanged") fails with `ENOENT` on `fixtures/big-sample.csv`. The README says that file is too large for the repo and lives on the team drive, so you copy it in by hand. It isn't in this checkout. This failure has nothing to do with the parse bug. It was failing before my change.

Result of `node --test`: 4 tests, 3 pass, 1 fail. CI needs a green run, so this blocks shipping.

Options for you:
- Copy the fixture into `fixtures/` and re-run. If CI has the same problem, it needs the file too (artifact download or similar).
- Make the test generate its own small sample, or skip when the file is missing. Skipping would hide the coverage gap, so I haven't done either. Tell me if you want one of them.

I haven't committed anything.