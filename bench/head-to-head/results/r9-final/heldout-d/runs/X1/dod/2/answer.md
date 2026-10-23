```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: shop, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          665ddc9
  - dirty:         no
  - changed files: 4 (in HEAD)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)  (detect-stubs: 5 files, detect-empty-functions: 5 files)

[3/5] Tests
  - runner: npm-test (node --test)
  - 4 passed, 0 failed, 0 skipped (249 ms)
  - Note: the script's JSON summary reported passed=0. Its raw output shows pass 4 / fail 0 and exit_code 0, so I'm using the raw counts.

[4/5] E2E probe
  - node -e calling applyDiscount and money from src/
  - exit_code: 0
  - evidence:  applyDiscount(1000,150)=0, (1000,-5)=1000, (1000,10)=900, money(0)="0.00"

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

## What went in

Commit `665ddc9`, `fix(price): clamp discount percent to 0-100`:

- **`src/price.js`:** `applyDiscount` now clamps `percent` to 0–100. A discount over 100% gives 0 instead of a negative price, and a negative discount no longer raises the price.
- **`test/price.test.js`** (new): three tests, for a 150% discount (0), a -5% discount (price unchanged), and a normal 10% discount (900).
- **`src/format.js`:** removed a leftover debug `console.log` from `money()`.
- **`package.json`:** version bumped from 1.4.2 to 1.4.3.

## Things to know

- **The test file wasn't staged.** `test/price.test.js` was untracked, so I added it to the commit.
- **Two changes beyond the fix.** The `console.log` removal and the version bump were in your staged changes, so I included them and mentioned both in the commit message. If you wanted them in separate commits, say so and I'll split them.
- **The DoD-Guard hook fired after the commit.** It said `/dod:verify` hadn't passed recently, but the commit had already gone through. I ran verify afterward and it passes. Nothing was bypassed or amended.
- **`.dod-guard/` is untracked.** I created it for the verify marker. `git status` didn't list it, so it looks gitignored.
- **DOD.md items I didn't do:** the "documentation updated" item isn't covered, and `applyDiscount` has no JSDoc. Neither blocked verify.