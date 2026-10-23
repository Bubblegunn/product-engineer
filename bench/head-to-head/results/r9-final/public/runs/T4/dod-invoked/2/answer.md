I'm wrapping up: verification is done, so here's the report and the release notes summary.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          d85083e
  - dirty:         yes (RELEASE_NOTES.md, untracked)
  - changed files: 0 tracked, 1 untracked

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs.sh and detect-empty-functions.py each scanned 8 files)

[3/5] Tests
  - runner: npm-test (node --test)
  - 5 passed, 0 failed, 0 skipped (1398 ms)
  (The runner's summary said 0 passed because it couldn't parse node's output. Its raw output and my own `node --test` run both show 5 pass, 0 fail.)

[4/5] E2E probe
  - node -e calling listBookings and toCsv
  - exit_code: 0
  - evidence:  120 bookings give a 50-row page 1 and a 20-row page 3; a guest "=HYPERLINK(...)" is exported as '=HYPERLINK(...)

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**Release notes:** `RELEASE_NOTES.md` covers the four customer-visible changes since v1.4.0, which is version 1.4.1:
- CSV exports now neutralise spreadsheet formulas.
- The bookings list loads 50 at a time.
- Cancelled bookings no longer get the day-before reminder.
- Stay totals are rounded to the cent.

I left out the bulk cancel button. It was added and then reverted inside this range, so customers never get it.

**Problem for you:** `README.md` still has a "Bulk cancel" section from commit e94ed75, and that commit wasn't reverted. The README now describes a feature that doesn't exist. I didn't touch it because you didn't ask, but you should remove that section.

**DoD.md items still open:**
- The pagination and rounding changes have no tests. The 5 tests don't cover them.
- `DOD.md` still has its placeholder project-specific criterion.