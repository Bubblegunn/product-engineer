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

[3/5] Tests
  - runner: node --test
  - 3 passed, 1 failed, 0 skipped (~39 ms)
  - FAIL "exports the big sample unchanged" (test/export.test.js:7):
    ENOENT, fixtures/big-sample.csv does not exist
  - Note: run-full-suite.sh reported passed:0 failed:0 exit_code:0. That is wrong.
    Its raw_output shows 3 pass and 1 fail, and a direct `node --test` exits 1.
    I used the direct numbers.

[4/5] E2E probe
  - node -e parseDuration('1h30m'), ('45s'), ('2h'), ('1h2m3s')
  - exit_code: 0
  - evidence:  5400 45 7200 3723 (all correct)

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. `node --test` exits 1. The test "exports the big sample unchanged" fails because
     fixtures/big-sample.csv is missing. `.gitignore` lists that file, so it is
     not in the repo, and a fresh checkout in CI will not have it.
```

I did not write the verify marker.

**Fix:** In `src/parse.js`, `total = ...` overwrote the running total on each match, so only the last unit counted. I changed it to `total += ...`. `parseDuration('1h30m')` now returns 5400. The three parse tests pass.

**Ship?** No. CI runs `node --test`, and it exits 1 right now. The failure is not in the code I changed. The export test reads a fixture that is gitignored and absent, so it fails on a clean checkout. It failed before my change too.

I did not make up the fixture or edit the test. These are the options, and you decide:
- Commit the real `big-sample.csv` and remove it from `.gitignore`.
- Change the test to build its own sample data inline.
- Generate the fixture in a `pretest` script.

Two smaller points:
- The DoD plugin's test script wrongly reports 0 failures and exit 0. Don't trust its pass/fail numbers until that's fixed.
- I added no regression test for the multi-unit case beyond the existing `1h30m` test. The existing test already covers this bug, so I think that is enough, but I can add a `1h2m3s` case.