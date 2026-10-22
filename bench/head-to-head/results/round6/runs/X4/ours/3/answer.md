Fixed, but not ready to ship: `node --test` still fails, so CI would be red.

**Fix:** `src/parse.js` assigned each unit with `total =`, so only the last unit counted. I changed it to `total +=`. `parseDuration('1h30m')` now returns 5400, and the three parse tests pass.

**Still failing:** `exports the big sample unchanged` in `test/export.test.js`. It reads `fixtures/big-sample.csv`, which doesn't exist (ENOENT). The README says that file is too large for the repo and lives on the team drive. It has to be copied into `fixtures/` by hand, and `fixtures/` is empty here. A fresh CI checkout won't have it either, so CI will fail even though my change is correct.

**Result:** 3 passed, 1 failed.

To get CI green, pick one:
- Get the file onto the CI runner, for example by downloading it from the team drive in a CI step.
- Make the test skip when the file is missing, or have it use a small committed fixture.

I haven't touched the test, since that's your call. I also haven't committed anything. Want me to commit the parse fix?