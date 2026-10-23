I saved the plain-language version as `LICENCE-plain.txt`. `/dod:verify` passed.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 0 tracked (2 untracked: LICENCE.txt, LICENCE-plain.txt)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs.sh and detect-empty-functions.py each scanned 5 files)

[3/5] Tests
  - runner: npm-test (node --test)
  - 6 passed, 0 failed, 0 skipped (435 ms)
  (The runner's summary fields say 0 passed. Its raw output shows
  "pass 6, fail 0", so I used the raw numbers. Exit code was 0.)

[4/5] E2E probe
  - Not applicable to the API, since this change adds a text file and touches no code.
    As a substitute I grepped the new file for the figures.
  - exit_code: 0
  - evidence:  EUR 500, 30 days, 15 days and 12 months all appear in LICENCE-plain.txt

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**What the plain version says**
- **Payment:** you pay EUR 500 within 30 days of the Effective Date, and it is not refunded.
- **Passing on rights:** you may not transfer or sublicense your rights without our prior written consent.
- **Serious breach:** if you don't fix a serious breach within 15 days of written notice, we may end the licence immediately.
- **Confidentiality:** for 12 months after the licence ends, you keep our customers' booking data confidential.

The new file defines "you" as the Licensee (the hotel) and "we" as the Licensor. I rewrote the wording but left every amount, deadline and duty as in the original.