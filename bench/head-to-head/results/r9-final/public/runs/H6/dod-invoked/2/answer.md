I wrote `LICENCE-plain.txt` (new file, nothing else changed), and `/dod:verify` passes.

The plain version says "you" for the hotel and "we" for the licensor. It keeps all four obligations as they were:
1. The hotel pays EUR 500 within 30 days of the Effective Date, and the fee is non-refundable.
2. The hotel can't transfer or sub-license its rights without the licensor's prior written consent.
3. If the hotel doesn't fix a serious breach within 15 days of written notice, the licensor may end the licence immediately.
4. The hotel keeps the licensor's customers' booking data confidential for 12 months after the licence ends.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes (untracked only)
  - changed files: 0 tracked diffs; 2 untracked (LICENCE.txt, LICENCE-plain.txt)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  - detect-stubs.sh: 0 issues in 5 files
  - detect-empty-functions.py: 0 issues in 5 files

[3/5] Tests
  - runner: npm-test
  - 6 passed, 0 failed, 0 skipped (278 ms)
  - Note: the runner's summary fields said 0 passed. Its raw output shows 6 tests passing, 0 failing, and it exited 0.

[4/5] E2E probe
  - no probe applicable in this environment (the change is a text document, not code)
  - exit_code: n/a
  - evidence:  the existing suite, including the HTTP tests for /health and POST /orders, passes unchanged

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

The verify marker is refreshed, so you can `git commit` within the TTL.

`DOD.md` still has its placeholder project-specific criterion. That is a template item, not something this task changes.