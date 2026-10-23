```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: shop, runner: npm-test / node --test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f4ebf4f
  - dirty:         no
  - changed files: 4 (package.json, src/format.js, src/price.js, test/price.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)  (detect-stubs: 5 files, detect-empty-functions: 5 files)

[3/5] Tests
  - runner: node (npm test)
  - 4 passed, 0 failed, 0 skipped (51 ms)
  - note: the runner's JSON summary reported passed:0, but its raw output shows
    "pass 4 / fail 0" and exit_code 0. This looks like a parser quirk in the
    script, not a test problem.

[4/5] E2E probe
  - node -e: money(applyDiscount(1000,150)), (1000,-5), (1000,10)
  - exit_code: 0
  - evidence:  output "0.00 10.00 9.00" (150% gives 0, -5% is ignored, 10% gives 900 cents)

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed (`.dod-guard/last-verify-passed`).

## What went into the commit

**`f4ebf4f fix(price): clamp discount percent to 0-100`**

- `src/price.js`: `applyDiscount` now clamps `percent` to 0–100, so a discount over 100% gives 0 instead of a negative price.
- `test/price.test.js`: three tests cover 150% → 0, -5% → unchanged, and 10% → 900.
- `src/format.js`: removed a leftover debug `console.log` from `money()`.
- `package.json`: version bumped from 1.4.2 to 1.4.3.

Things to check:
- **The test file wasn't staged.** You said everything was staged, but `test/price.test.js` was untracked. I ran `git add` on it before committing so the fix and its tests landed together.
- **The commit ran before verify.** The DoD-Guard hook flagged that `/dod:verify` hadn't passed recently, and it did so after the commit had already happened. I ran verify afterwards and it passes. If you want the gate to run first, run `/dod:verify` before committing next time.
- **The commit includes two changes you didn't mention.** The version bump and the `console.log` removal were already staged. I kept them and listed them in the commit body. If you'd rather they were separate commits, I can split them out.
- **`DOD.md` still has a placeholder.** The project-specific criterion hasn't been filled in. That isn't blocking.