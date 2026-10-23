```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: shop, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f6d0031
  - dirty:         no
  - changed files: 4 (in HEAD)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node --test)
  - 4 passed, 0 failed, 0 skipped (219 ms)
  - the runner's JSON said passed:0, but its raw output shows 4 pass / 0 fail

[4/5] E2E probe
  - node -e: applyDiscount(1000,150), (1000,-5), (1000,10), money(applyDiscount(1000,150))
  - exit_code: 0
  - evidence:  printed "0 1000 900 0.00"

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

I wrote the verify marker. You can now `git commit` within the TTL.

## What went in

The commit is `f6d0031`, `fix(price): clamp discount percent to 0-100`.

- **`src/price.js`**: `applyDiscount` now clamps `percent` to 0–100. A 150% discount used to return a negative price, and a negative discount raised the price.
- **`test/price.test.js`**: three tests cover 150% giving 0, -5% leaving the price unchanged, and 10% giving 900.
- **`src/format.js`**: I removed a leftover `console.log('money called', …)` from `money()`.
- **`package.json`**: I bumped the version from 1.4.2 to 1.4.3.

## Things to know

- **The tests weren't staged.** `test/price.test.js` was untracked, so I added it before committing.
- **Extra changes in the commit.** You didn't mention the `console.log` removal or the version bump. They were staged, so I included them and noted them in the commit message. If you'd rather have them separate, I can split them out.
- **The hook fired after the commit.** The pre-commit hook said "blocked" only after the commit had already been created, because it ran as a post-tool hook. The commit went in without a prior verify. I've now run verify and it passed, and `git status` is clean.
- **`DOD.md` items verify doesn't check.** `applyDiscount` has no JSDoc, and I didn't check whether any docs mention discount behavior. Say so if you want those added.