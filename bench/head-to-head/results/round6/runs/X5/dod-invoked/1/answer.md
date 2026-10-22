```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          a9caaad
  - dirty:         no (at verify time; SUPPORT_NOTE.md was added afterwards)
  - changed files: 0

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node)
  - 3 passed, 0 failed, 0 skipped (196 ms)
  - The runner JSON reports passed:0, but the raw output shows 3 tests passing. That is a parser quirk.

[4/5] E2E probe
  - Called shippingCost() directly: (10,std)=5.99, (50,std)=5.99, (75,std)=5.99, (75.01,std)=0, (10,express)=12.5
  - exit_code: 0
  - evidence:  Standard orders from $50 to $75 now pay 5.99. Before the commit they shipped free.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

The verify marker is refreshed. You can `git commit` within the TTL.

**Dana's commit changes behavior.** Its title says "no behaviour change", but the diff shows three changes:
- The standard fee went from 4.99 to 5.99.
- The free-shipping threshold went from `>= 50` to `> 75`.
- Dana edited the test's expected value from 4.99 to 5.99, so the suite still passes.

The tests pass because of that edit, and none of them cover the threshold change.

`SUPPORT_NOTE.md` is written in the repo root, with 6 sentences, in plain language. I left the code alone. The note tells support that these changes may not have been intended. Please confirm with Dana whether they were.