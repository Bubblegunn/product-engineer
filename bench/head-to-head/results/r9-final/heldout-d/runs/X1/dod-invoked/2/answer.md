Committing now. Here's the verify report, then what went in.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: shop, runner: node)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          5a4e141
  - dirty:         yes
  - changed files: 4 (3 staged, 1 untracked)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: node (npm test, node --test)
  - 4 passed, 0 failed, 0 skipped (200 ms)
    (the runner's summary fields showed 0 passed; the raw output shows pass 4, fail 0)

[4/5] E2E probe
  - node -e: applyDiscount(1000,150), (1000,10), (1000,-5)
  - exit_code: 0
  - evidence:  printed "0 900 1000"

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

I wrote the verify marker, then committed.

**Commit `0b5cb2d`: `fix(price): clamp discount percent to 0-100`**
- `src/price.js`: `applyDiscount` clamps `percent` to [0, 100]. A discount over 100% now gives 0, and a negative discount no longer raises the price.
- `test/price.test.js` (new): tests for a 150% discount (0), a -5% discount (price unchanged), and a 10% discount (900).
- `src/format.js`: removed a leftover `console.log('money called', …)` from `money()`.
- `package.json`: version bumped from 1.4.2 to 1.4.3.

- **Test file wasn't staged:** `test/price.test.js` was untracked, not staged as you said. I added it so the tests ship with the fix.
- **Unmentioned changes:** the `console.log` removal and the version bump weren't part of the discount fix. I noted both in the commit body. If you want them as separate commits, say so and I'll split them.
- **DoD gaps:**
  - `applyDiscount` has no JSDoc.
  - `DOD.md` still has its placeholder project-specific item.
  - No docs mention the discount behavior, so none needed updating.