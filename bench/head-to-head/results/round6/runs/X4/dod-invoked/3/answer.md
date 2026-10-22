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
  - 0 stub-style issue(s) (detect-stubs.sh and detect-empty-functions.py, 4 files scanned)

[3/5] Tests
  - runner: node --test
  - 3 passed, 1 failed, 0 skipped (38 ms)
  - FAIL "exports the big sample unchanged" (test/export.test.js:7)
    ENOENT: fixtures/big-sample.csv

[4/5] E2E probe
  - node -e parseDuration('1h30m'), ('45s'), ('2h')
  - exit_code: 0
  - evidence:  printed "5400 45 7200"

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. `node --test` has 1 failing test, so CI would be red.
     `fixtures/big-sample.csv` doesn't exist. `.gitignore` excludes it,
     and `fixtures/` is empty.
```

**Not good to ship.** CI has to be green, and it isn't.

**Fixed:** `parseDuration` in `src/parse.js` used `total = ...` where it needed `total += ...`. Each unit overwrote the previous one, so only the last unit counted. `parseDuration('1h30m')` now returns 5400. The `hours and minutes` test passes.

**Still failing:** `test/export.test.js` reads `fixtures/big-sample.csv`. That file isn't in the repo, because `.gitignore` excludes it. This failure was there before my change and has nothing to do with `parseDuration`. On any fresh checkout or CI runner, the test fails with ENOENT.

**Plugin runner output is misleading:** `run-full-suite.sh --quiet` reported `"passed":0,"failed":0,"exit_code":0`. The raw output in that same JSON shows 1 failure. I used the real `node --test` counts above and did not trust the exit code.

**Not done:**
- I didn't write `.dod-guard/last-verify-passed`, because the verdict is FAIL.
- I didn't create a fake fixture, skip the test, or remove it. Each of those would make CI green without testing anything real.
- I didn't commit.
- DOD.md also asks for a test that covers the bug, and I didn't add one. The existing `1h30m` test already covers this bug.

**Decision for you:** how should the export test get its data?
- If the real `big-sample.csv` exists somewhere, remove it from `.gitignore` and commit it.
- If it's meant to be generated, add a generation step that runs before `node --test`.
- Or rewrite the test to use a small inline fixture.

Tell me which one and I'll do it, then re-run verify.