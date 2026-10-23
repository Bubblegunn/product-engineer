Verification passed and `RELEASE_NOTES.md` is written. Here is the verify report.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: fetchkit, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          4fa8b8b (same commit as v1.3.0)
  - dirty:         no (before RELEASE_NOTES.md was added)
  - changed files: 0

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)  (detect-stubs.sh and detect-empty-functions.py, 3 files scanned)

[3/5] Tests
  - runner: node --test (reported as npm-test)
  - 2 passed, 0 failed, 0 skipped (203 ms)
  - The runner's summary said 0 passed, but its raw output shows pass 2 / fail 0, so I report 2.

[4/5] E2E probe
  - node -e: withRetry succeeds on the 3rd attempt, and fetchAll with { limit: 2 } returns 2 items
  - exit_code: 0
  - evidence:  printed `ok [ 1, 2 ]`

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

I wrote the verify marker to `.dod-guard/last-verify-passed`.

**What the release notes say** (v1.2.0 to v1.3.0):
- **Option rename:** `maxItems` is now `limit`. I put this under "Action required", because code still passing `maxItems` is silently ignored.
- **Retries:** there is a new `withRetry` helper with 2 retries by default.
- **Timeout:** the default is now 45 seconds, up from 30.
- **CSV export:** it was added and then reverted, so the notes say it isn't included.

**Problems in the repo you should know about** (I didn't change any of them):
- **Timeout commit message:** the commit says "increase default timeout to 60s", but the code sets 45000 ms. The notes say 45 seconds, since that is what ships.
- **README:** it still says "Supports CSV export of reports", which isn't true. The notes call this out as a mistake, but the README itself needs fixing.
- **`package.json` version:** it still says `1.2.0` even though v1.3.0 is tagged.
- **`DOD.md` placeholder:** the project-specific criterion is still a placeholder. I didn't treat it as blocking.

`RELEASE_NOTES.md` is uncommitted.