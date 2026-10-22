**Not good to ship: `node --test` is red.** I fixed the bug, but one test still fails for a reason unrelated to it.

**Fix:** `parseDuration` in `src/parse.js` used `total = ...` inside the loop, so only the last unit survived. `1h30m` returned 1800 (the `30m` part). I changed it to `total += ...`. The `hours and minutes` test now passes (5400), as do `seconds only` and `hours only`.

**Why CI is red:** `test/export.test.js` ("exports the big sample unchanged") fails with ENOENT because `fixtures/big-sample.csv` doesn't exist. The file is gitignored. The README says it lives on the team drive and has to be copied in by hand. A fresh checkout in CI won't have it, so that test fails whatever `parseDuration` does. It was already failing before my change.

**Result:** 3 tests pass and 1 fails.

**Options to get green** (your call, since each changes how the repo or CI works):
1. Make the CI job fetch the fixture from the team drive before the tests run.
2. Commit a small fixture, or have the test generate its own rows. The current `toCsv` test doesn't need a large file.
3. Skip the test when the fixture is missing. This hides the failure, so I wouldn't pick it for a required check.

I haven't tried the real fixture, so I can't say whether that test would pass with it. I also haven't committed anything.

**Changelog skill:** I didn't produce a weekly changelog. The repo has a single commit and your request was a fix plus a ship verdict. The skill says to avoid running tests, but I ran `node --test` because you asked whether CI would be green. I can write the changelog if you want one.