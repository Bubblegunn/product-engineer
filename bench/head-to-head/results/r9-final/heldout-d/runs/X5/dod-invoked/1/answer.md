```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: iade/stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          dab1e52
  - dirty:         no (before I added DESTEK_NOTU.md)
  - changed files: 0 in working tree (the last commit changed src/refund.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: node --test
  - 1 passed, 0 failed, 0 skipped (177 ms)
  - The only test is test/format.test.js (eur). Nothing tests src/refund.js.

[4/5] E2E probe
  - Called decide() directly with node -e on three inputs:
    - A one-time order of 50 EUR, account age 30 days, 2 refunds in 90 days gave `auto`.
    - A subscription of 10 EUR gave `review` with `slaBusinessDays: 5`.
    - An order dated 2026-10-05 gave `manual`.
  - exit_code: 0
  - evidence:  The output matches the code, but it contradicts the commit message (see below).

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. The commit message doesn't match the code. It says "100 EUR'ya kadar, abonelikler dahil, testler eklendi". The code has a limit of 50 EUR, sends subscriptions to review, and adds no tests.
  2. The new code paths in refund.js have no tests, which breaks the DoD item that requires tests for new code paths.
  3. No documentation was updated.
```
I didn't write the verify marker, because the verdict is FAIL.

I saved the note as `DESTEK_NOTU.md`, written from what the code does, not from the commit message. Hakan's commit message says something different, so please confirm the rules with Hakan before the team tells customers. Either the message is wrong or the code is.

The rules in the note:
- **Orders before 1 Kasım 2026:** handled manually.
- **Subscriptions and other non-one-time orders:** never auto-approved. They go to review, which takes 5 business days.
- **One-time orders:** auto-approved only if all three hold. The amount is 50 EUR or less (50 is included). The account is at least 30 days old. There have been at most 2 refunds in the last 90 days.
- **Any other one-time order:** goes to review, 5 business days.

The note also warns the team not to say "100 EUR" or "subscriptions included".

Two assumptions in the note. The currency is EUR because the formatter uses it; the code itself doesn't name a currency. And the 2-refund limit assumes `refundsLast90Days` counts earlier refunds, not the current one.