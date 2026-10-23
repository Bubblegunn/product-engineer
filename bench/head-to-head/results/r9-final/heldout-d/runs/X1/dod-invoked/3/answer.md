```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: shop, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          5a4e141 (before commit)
  - dirty:         yes
  - changed files: 4 (3 staged, 1 untracked)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node --test)
  - 4 passed, 0 failed, 0 skipped (339 ms)
  - Note: the script's summary counters read 0 passed. Its raw output shows 4 pass, 0 fail.

[4/5] E2E probe
  - node -e calling applyDiscount(1000,150), (1000,-5), (1000,10)
  - exit_code: 0
  - evidence:  printed "0 1000 900"

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**Committed as `6efd002`: "fix(price): clamp discount percent to 0-100"**

- `src/price.js`: `applyDiscount` now clamps the percent to 0–100. A discount over 100% gives 0 instead of a negative price, and a negative discount leaves the price unchanged.
- `test/price.test.js` (new): three tests, covering over-100%, negative and 10% discounts.
- `src/format.js`: removed a leftover debug `console.log` from `money()`.
- `package.json`: version bumped from 1.4.2 to 1.4.3.

- **Test file wasn't staged:** `test/price.test.js` was untracked, not staged as you said. I added it so the commit includes the tests.
- **Extra changes:** The `console.log` removal and the version bump were also in your staged changes. I listed them in the commit message, so say so if you'd rather they went in separately.
- **DoD checklist:** `DOD.md` also asks for JSDoc on public functions and doc updates. I didn't check or change either.