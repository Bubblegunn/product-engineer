The changelog is saved as `CHANGELOG-WEEK.md`, and `/dod:verify` passed.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          ebe42d6
  - dirty:         no (when verify started; CHANGELOG-WEEK.md was added afterwards)
  - changed files: 0

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s) (stub scan: 11 files; empty-function scan: 11 files)

[3/5] Tests
  - runner: npm-test (node --test)
  - 6 passed, 0 failed, 0 skipped (348 ms)
  - The runner's summary JSON said 0 passed, but its raw output shows 6 passing and 0 failing, so I used the raw output.

[4/5] E2E probe
  - node -e "require('./src/router')" loaded the router and exported `handle`. This is a light probe. The /health and POST /orders requests were exercised only by the test suite.
  - exit_code: 0
  - evidence:  [ 'handle' ]

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

- **Verify marker:** I wrote it to `.dod-guard/last-verify-passed`, so you can commit within the TTL.
- **Unmet DoD item:** `DOD.md` still has its placeholder project-specific criterion. Verify doesn't check it, so it's unmet.
- **Changelog:** it's grouped by feature area: Search, Billing, Auth, and Documentation and maintenance.
- **Occupancy heatmap:** the commit (ebe42d6) is dated 21 Oct, outside the 14–20 Oct window. I left it out of the main sections and noted it at the bottom for next week.