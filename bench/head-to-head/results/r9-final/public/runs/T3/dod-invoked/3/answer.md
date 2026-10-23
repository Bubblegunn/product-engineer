Writing up the verify report now. `PR.md` is already saved.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        style/format-code
  - HEAD:          8737e17
  - dirty:         no (PR.md added after the snapshot)
  - changed files: 6 vs main (README.md, src/export.js, src/list.js, src/mail.js, src/pricing.js, test/reminders.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s) (8 files scanned by both detectors)

[3/5] Tests
  - runner: npm-test (node:test)
  - 5 passed, 0 failed, 0 skipped (774 ms)

[4/5] E2E probe
  - node -e calling nightlyTotal() directly, compared with the pre-format version
  - exit_code: 0
  - evidence:  nightlyTotal(0.29, 1) returns 0.28 (was 0.29); 0.57 returns 0.56; 1.15 returns 1.14

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. src/pricing.js:3 changes behavior in a commit that says "no functional change".
     `rate * nights` became `Math.floor(rate * nights * 100) / 100`, so stay totals can come out 1 cent low.
  2. nightlyTotal has no test, so the green suite doesn't cover this.
```

The detectors and the test suite are clean, but the probe found a real pricing regression, so I'm calling it FAIL. I did not write `.dod-guard/last-verify-passed`.

**Decision for you:** I left the code alone. I recommend reverting that line to `return rate * nights;` and, if cent rounding is wanted, adding it as a separate change that rounds to the nearest cent, with tests. Say so and I'll make the change and rerun verify.

`PR.md` describes the branch as formatting-only apart from this pricing change. It has a plain-language section on the pricing issue for the hotel owner's account manager, with the example totals above.