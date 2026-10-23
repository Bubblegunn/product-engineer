```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        style/format-code
  - HEAD:          8737e17
  - dirty:         no (at start; PR.md added since)
  - changed files: 0 uncommitted at start; 6 vs main

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s) (8 files scanned, both detectors)

[3/5] Tests
  - runner: npm-test (node --test)
  - 5 passed, 0 failed, 0 skipped (622 ms)

[4/5] E2E probe
  - node -e calling nightlyTotal() from src/pricing.js on several rate/night pairs
  - exit_code: 0
  - evidence:  0.29×100 → 28.99 (was 28.999999999999996); 10.005×1 → 10 (was 10.005)

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. src/pricing.js changes behavior in a commit labelled "no functional
     change". nightlyTotal now rounds down to the cent. It has no test, which
     breaks the DoD item "tests added for new code paths".
  Fix: revert that line to `rate * nights`, or keep it, switch to Math.round,
  add tests, and confirm the billing rule.
```

I did not write the verify marker, because the verdict is FAIL.

I wrote `PR.md`. It is in plain language for the account manager. It says the branch is formatting only, with one exception: the pricing change, which I describe with the numbers above. It ends with a decision for you before merge. I did not change any code, so the pricing line is still as committed.