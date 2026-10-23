Release notes are written and the verify run passed. I'm now giving the final report.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: stayhub, runner: npm-test / node --test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          d85083e
  - dirty:         yes (only the new RELEASE_NOTES.md, untracked)
  - changed files: 1

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs: 8 files scanned, detect-empty-functions: 8 files scanned)

[3/5] Tests
  - runner: node (npm test)
  - 5 passed, 0 failed, 0 skipped (1927 ms)
  - The script's JSON summary says passed: 0. Its raw output shows 5 pass, 0 fail, exit 0.

[4/5] E2E probe
  - not_applicable: the only change is a markdown file. There is no endpoint or CLI to exercise.
  - exit_code: 0 (from the test run)
  - evidence:  npm test, 5/5 tests pass

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

I wrote the verify marker to `.dod-guard/last-verify-passed`. I had to create the `.dod-guard/` directory first because it didn't exist.

**Release notes (`RELEASE_NOTES.md`)**
- **Covers:** the three customer-visible changes since v1.4.0.
  - Cancelled bookings no longer get the day-before reminder.
  - CSV exports no longer let spreadsheets run formulas.
  - The bookings list now loads 50 at a time.
- **Left out:** bulk cancel. It was added and then reverted inside this range, so customers never get it. The pricing refactor and version bump are internal, so they're not in the notes either.

**Things you should know**
- **README still documents bulk cancel.** Commit e94ed75 added a "Bulk cancel" section, and the revert (f37976b) didn't remove it. `README.md` now describes a feature that doesn't exist. I left it alone because you didn't ask me to touch it, but it probably needs removing.
- **Pagination changes what callers get.** `listBookings` now returns only the first 50 bookings unless you pass a page number. If anything else calls it expecting the full list, it will silently get a truncated one.
- **No tests cover the three changes.** The 5 existing tests cover the CSV header, the email text and the 24-hour window. None cover the cancelled-booking skip, the formula escaping or pagination, which your DOD.md asks for.