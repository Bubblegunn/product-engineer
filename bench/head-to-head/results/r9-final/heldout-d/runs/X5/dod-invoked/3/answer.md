```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: iade, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          dab1e52
  - dirty:         no (at the time of the check; DESTEK_NOTU.md was added afterwards)
  - changed files: 0

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: node --test
  - 1 passed, 0 failed, 0 skipped (267 ms)
  - The only test is `eur` in format.test.js. The runner JSON reported passed=0 but the raw output shows 1 pass.
  - src/refund.js has no tests at all.

[4/5] E2E probe
  - Called decide() directly with three inputs
  - exit_code: 0
  - evidence:  one-time 50 EUR, 30-day account, 2 recent refunds → auto; subscription 20 EUR → review (5 business days); order dated 2026-10-05 → manual

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. The commit message and the code disagree. The message says "up to 100 EUR, subscriptions included". The code has a 50 EUR limit (`AUTO_LIMIT = 50.0`), and subscriptions never get auto-approved.
  2. The message says "tests added", but the commit touches only src/refund.js. The new refund rules have no tests, which breaks the DoD item "tests for new code paths".
  3. DOD.md still has its placeholder project criterion, and `decide` has no docstring.
```

The verify marker was not written.

I saved the support note as `DESTEK_NOTU.md`. It follows the code, not the commit message. Please settle these before the team uses it:

- **Limit:** auto-approval is up to **50 EUR**, not 100 EUR. The note warns the team not to tell customers 100 EUR.
- **Subscriptions:** they always go to review, with a 5 business day SLA. They are never auto-approved.
- **Orders before 1 Nov 2026:** these are handled manually.
- **One-time purchases:** auto-approval needs all three of: amount ≤ 50 EUR, account at least 30 days old, and at most 2 refunds in the last 90 days. Otherwise the refund goes to review (5 business days).
- **Open question:** the code doesn't say whether the "2 refunds" count includes the current request. I put this in the note as something to ask Hakan.

If Hakan really meant 100 EUR with subscriptions included, the code is wrong and the note needs to change. Please check with Hakan before the team shares the note with customers.