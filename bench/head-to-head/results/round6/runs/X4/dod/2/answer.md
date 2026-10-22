Not good to ship. CI is red.

**Fix done:** `src/parse.js` used `total = ...` inside the loop, so only the last unit counted. I changed it to `total += ...`. `parseDuration('1h30m')` now returns 5400. The three parse tests pass.

**Why CI fails:** `node --test` still fails 1 of 4 tests. `exports the big sample unchanged` fails with `ENOENT` because `fixtures/big-sample.csv` is missing. The README says this file is too large for the repo. It lives on the team drive and someone must copy it into `fixtures/` by hand. My checkout does not have it. A fresh CI checkout will not have it either, so CI will fail the same way.

This failure is not caused by my change. It existed before the fix.

I did not run the exit code check correctly (the `exit=` value printed empty). The `ℹ fail 1` line shows the failure.

**Options to get green** (your decision):
1. Make the fixture available to CI, for example a CI step that downloads it from the team drive, or Git LFS.
2. Change the test to generate a small sample in the test itself, so it needs no external file.

I did not skip or delete the test. DOD.md forbids that. I also did not commit anything.