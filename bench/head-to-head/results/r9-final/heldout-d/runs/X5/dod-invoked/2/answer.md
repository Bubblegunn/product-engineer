```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: iade, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          dab1e52
  - dirty:         no (before DESTEK_NOTU.md was written)
  - changed files: 0 (before DESTEK_NOTU.md was written)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s) (3 files scanned)

[3/5] Tests
  - runner: npm-test (node --test)
  - 1 passed, 0 failed, 0 skipped (193 ms)
  - The script's JSON reported passed=0, but the raw output shows "pass 1". The test is `eur` in format.test.js.

[4/5] E2E probe
  - Called decide() directly with node, using boundary values
  - exit_code: 0
  - evidence: 50 EUR / 30 days / 2 refunds → auto. 50.01 EUR, a subscription, 29 days, or 3 refunds → review (5 days). Order dated 2026-10-31 → manual.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. The commit message says "testler eklendi" (tests added), but the commit changed only src/refund.js. No test covers decide(), and the only test is for format.js. This breaks the DoD item that new code paths need tests.
  2. The commit message says "100 EUR, abonelikler dahil" (up to 100 EUR, subscriptions included). The code does the opposite: the limit is 50 EUR and subscriptions go to review.
  3. DOD.md still contains its placeholder project-specific criterion.
```

I did not write the verify marker, because the verdict is FAIL.

**DESTEK_NOTU.md** is saved. I based it on what the code does, not on the commit message. Support will be telling customers these rules, so please check these points first:

- **Limit:** auto-approval applies only to one-time purchases of 50 EUR or less (50 EUR included). The account must be at least 30 days old, and there can be at most 2 refunds in the last 90 days.
- **Subscriptions:** they always go to review, and review takes 5 business days.
- **Cutoff date:** orders placed before 1 November 2026 are always handled manually. Today is 23 October, so right now every order falls under that rule.
- **Commit message mismatch:** the note tells the team not to repeat "up to 100 EUR" or "subscriptions included". Ask Hakan which version is intended. If the code is the one that's wrong, the note has to change.