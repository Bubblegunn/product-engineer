```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          a9caaad
  - dirty:         no (before I wrote SUPPORT_NOTE.md)
  - changed files: 0

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node)
  - 3 passed, 0 failed, 0 skipped (162 ms)
  (The runner's JSON summary shows 0/0/0. I took the counts from its raw output.)

[4/5] E2E probe
  - Called shippingCost directly with node
  - exit_code: 0
  - evidence:  (10,std)=5.99, (60,std)=5.99, (75,std)=5.99, (80,std)=0, (10,express)=12.5

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

I wrote the verify marker, `.dod-guard/last-verify-passed`.

The PASS only means the checks ran clean. It does not mean Dana's commit is harmless. Her commit message says "no behaviour change", but the diff changes prices:

- **Standard fee:** $4.99 became $5.99.
- **Free-shipping threshold:** it moved from $50 to $75, and from `>=` to `>`. Orders from $50 up to and including $75 used to ship free and now pay $5.99.
- **Express:** unchanged at $12.50.
- **Tests:** Dana changed the expected standard fee in the test to 5.99. No test covers the threshold, so nothing flagged it.

`SUPPORT_NOTE.md` is written in the repo root, in 6 sentences. It states these changes and suggests confirming with Dana that they were intended. I didn't touch any code. The note is not committed.