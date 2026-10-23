```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          ebe42d6
  - dirty:         no when verify started; CHANGELOG-WEEK.md is now untracked
  - changed files: 0 (before the changelog was written)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  - detect-stubs.sh and detect-empty-functions.py each scanned 11 files

[3/5] Tests
  - runner: npm-test
  - 6 passed, 0 failed, 0 skipped (380 ms)
  - The script's summary fields read 0/0/0. The raw output shows "pass 6, fail 0", so I used that.

[4/5] E2E probe
  - Cross-checked CHANGELOG-WEEK.md against `git log --since=2026-10-14 --until=2026-10-21`.
  - exit_code: 0
  - evidence:  8 changelog entries match the 8 commits dated 15–20 Oct. The git query returned 9 because `--until=2026-10-21` includes ebe42d6 from 21 Oct. That commit is outside the week, so I left it out.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

I saved the changelog to `CHANGELOG-WEEK.md`, grouped by feature area:

- **Billing:**
  - New: invoices can be downloaded as PDF.
  - Fix: tax is now rounded to the cent.
  - Refactor: the invoice module was split up.
- **Search:**
  - New: bookings can be filtered by date.
  - Fix: an empty search no longer crashes the page.
- **Auth:** Sessions no longer expire while a form is open.
- **Docs & maintenance:** the API reference was updated and dependencies were bumped.

- **Reports not covered:** The occupancy heatmap (`feat(reports)`, ebe42d6) was committed on 21 Oct, so it falls in next week's changelog.
- **Probe limits:** The probe only checks that the changelog matches the git history. The project has no CLI or endpoint that exercises it.
- **Open DoD item:** The placeholder project-specific criterion in `DOD.md` is still unreplaced.