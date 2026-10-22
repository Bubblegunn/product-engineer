```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          a9caaad
  - dirty:         no (before SUPPORT_NOTE.md was written)
  - changed files: 0

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs.sh and detect-empty-functions.py each scanned 2 files)

[3/5] Tests
  - runner: npm-test
  - 3 passed, 0 failed, 0 skipped (167 ms)
  (The JSON summary showed passed=0, but the raw output lists 3 passing tests.)

[4/5] E2E probe
  - node -e calling shippingCost() with 5 inputs
  - exit_code: 0
  - evidence:  (10,false)=5.99, (60,false)=5.99, (75,false)=5.99, (76,false)=0, (10,true)=12.5

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

The marker `.dod-guard/last-verify-passed` is written, so a `git commit` within the TTL is allowed.

PASS only means the detectors and tests are clean. The tests don't catch what matters for support. Dana's commit, titled "no behaviour change", changed behavior and edited the test to match:
- **Standard shipping:** 4.99 became 5.99.
- **Free-shipping threshold:** 50 became 75, and `>=` became `>`. An order of exactly 75 now pays shipping.
- **Express:** unchanged at 12.50.

`SUPPORT_NOTE.md` is in the repo root (5 sentences, plain language). It says the commit message is wrong and that nobody has confirmed with Dana whether the changes were intended. You may want to ask Dana before sending it to support. I didn't touch any code, and the note is the only new file in the working tree. `.dod-guard/` doesn't show in `git status`.