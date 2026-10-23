I'm wrapping up: the fix is committed, and here is the verify report.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: ledgerlite, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          d81e40f (before commit; now 15170cd)
  - dirty:         yes (before commit)
  - changed files: 3 (src/pager.js, src/export.js, test/pager.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test
  - 4 passed, 0 failed, 0 skipped (159 ms)
  (the suite script's JSON shows passed: 0, but the raw output shows 4 passing)

[4/5] E2E probe
  - exportAll() on a 25-item array
  - exit_code: 0
  - evidence:  returned 25 items (before the fix it returned 20)

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

**Cause:** `pageCount` in `src/pager.js` used `Math.floor`, so a partial last page was dropped. `src/export.js` had the same bug with its own hardcoded `floor(len/10)`.

**Fix:**
- `pageCount` now uses `Math.ceil`.
- `exportAll` calls `pageCount` instead of its own calculation.

**Tested:**
- New `test/pager.test.js` covers `pageCount` for 0, 10 and 25 items, the contents of the partial last page, and `exportAll` for 25 and 7 items.
- `npm test` passes all 4 tests.
- The `exportAll` probe on 25 items returns 25.

**Committed:** as `15170cd`. I wrote the verify marker to `.dod-guard/last-verify-passed`, and it isn't part of the commit.

`DOD.md` still has an unfilled project-specific placeholder, and the README doesn't mention paging, so there was no doc to update.