```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: ledgerlite, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          d81e40f (before commit)
  - dirty:         yes (src/pager.js, src/export.js, test/pager.test.js)
  - changed files: 3

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node --test)
  - 4 passed, 0 failed, 0 skipped (186 ms)
  (The runner JSON reported passed:0, but the raw output shows 4 pass and 0 fail.)

[4/5] E2E probe
  - node -e "require('./src/pager').pageCount(25)"
  - exit_code: 0
  - evidence:  printed 3 (it was 2 before the fix)

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

**Cause:** `pageCount` in `src/pager.js` used `Math.floor`, so a partial last page was dropped. `src/export.js` had its own copy of the same `Math.floor(length / 10)` calculation, so it dropped that page too.

**Fix:**
- `pageCount` now uses `Math.ceil`.
- `exportAll` now calls `pageCount` instead of doing its own division.

**Tested:**
- I added `test/pager.test.js` with these cases:
  - `pageCount` for 0, 10 and 25 items.
  - `getPage(items of 25, 3)` returns the last 5 items.
  - `exportAll` returns all items for 25 and 20 items.
- `npm test` passed all 4 tests, including the existing `money` test.
- `pageCount(25)` printed 3.

**Not checked:** `DOD.md` still has its placeholder project-specific criterion. I didn't check it or the README for docs that mention paging.

I committed this as 23a5df0 and refreshed the verify marker.