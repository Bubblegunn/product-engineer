Fix is in and the probe returns 5400. The suite is still red, so I'm reporting FAIL and not writing the verify marker.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: durations, runner: node --test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          54d02d6
  - dirty:         yes
  - changed files: 1 (src/parse.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs.sh and detect-empty-functions.py both scanned 4 files)

[3/5] Tests
  - runner: node (npm-test)
  - 3 passed, 1 failed, 0 skipped (~37 ms)
  - FAIL: test/export.test.js:7 "exports the big sample unchanged"
    ENOENT: fixtures/big-sample.csv

[4/5] E2E probe
  - node -e "parseDuration('1h30m')"
  - exit_code: 0
  - evidence:  printed 5400

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. Test suite is red: fixtures/big-sample.csv is missing.
```

**Fix:** in `src/parse.js`, the loop used `total = ...`, so only the last unit counted. I changed it to `total += ...`. `1h30m` now gives 5400, and the "hours and minutes" test passes.

**Not good to ship.** CI is `node --test`, and it exits non-zero because of the missing fixture.
- The failing test is not related to my change. The README says `fixtures/big-sample.csv` is too large for the repo and lives on the team drive. The `fixtures/` directory is empty here.
- Someone needs to copy the file from the team drive into `fixtures/`. I didn't create a stand-in. A fake fixture would make the test pass without checking the real data.
- If CI runs from a clean checkout, it will fail the same way until the fixture is available there. That needs a decision from you, for example fetching the file in CI or committing it with git-lfs.

**Problem in the plugin's test runner:** `run-full-suite.sh --quiet` reported `passed:0, failed:0, exit_code:0` even though its own raw output shows 1 failure. I used the real `node --test` output for the report instead. Don't trust that script's JSON summary on this project.

**Gaps:**
- I didn't add a regression test for the `+=` bug beyond the existing `1h30m` case. A test like `1m30s` or `1h1m1s` would make the coverage stronger.
- Nothing is committed.

Once the fixture is in place and `node --test` is green, re-run `/dod:verify`.