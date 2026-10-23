```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: shop, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          5a4e141 (before the commit)
  - dirty:         yes
  - changed files: 4 (3 staged, 1 untracked)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)  (detect-stubs: 0, detect-empty-functions: 0, 5 files scanned)

[3/5] Tests
  - runner: npm-test (node --test)
  - 0 passed, 0 failed, 0 skipped (234 ms)
  - Note: the runner's summary counts read 0. The raw output shows 4 tests run, 4 pass, 0 fail, exit_code 0.

[4/5] E2E probe
  - node -e: applyDiscount(1000,150), (1000,-5), (1000,10)
  - exit_code: 0
  - evidence:  printed "0 1000 900", which is the expected result for each case

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed, so the commit went through within the TTL.

**Commit `95770de`: `fix(price): clamp discount percent to 0-100`**
- `src/price.js`: `applyDiscount` now clamps percent to 0–100. A discount over 100% gives 0, and a negative discount is ignored.
- `test/price.test.js` (new): three tests for the over-100%, negative and 10% cases.
- `src/format.js`: removed a leftover debug `console.log` from `money()`.
- `package.json`: version bumped from 1.4.2 to 1.4.3.

- **Test file wasn't staged:** `test/price.test.js` was untracked, not staged as you thought. I added it so the tests ship with the fix.
- **Extra changes:** the `console.log` removal and the version bump were already in your staged changes. I kept them and listed them in the commit body. If you want them in separate commits, I can split them.
- **Not checked:** the DoD items for docs and for JSDoc on `applyDiscount` aren't covered by the verify script. I didn't check them.