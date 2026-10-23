I ran `/dod:verify` and it failed. I couldn't write "tests pass" in the PR description, because they don't pass.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: inventory, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        feature/low-stock (checked out for the run; now back on main)
  - HEAD:          c718827
  - dirty:         no (before PR.md was written)
  - changed files: 3 vs main

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node --test)
  - 1 passed, 1 failed, 0 skipped (462 ms)
  - FAIL: "totalValue ignores negative quantities" (-15 !== 5, test/stock.test.js:8)

[4/5] E2E probe
  - node -e lowStock(fixtures) and lowStock([])
  - exit_code: 0
  - evidence:  ['A1'] and []

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: FAIL
  ═══════════════════════════════════════════════════════════
  1. The test suite has a failing test. It also fails on main, so this branch didn't cause it.
```

I didn't write the verify marker, so a commit that goes through the pre-commit hook would be blocked.

- **Failing test:** `totalValue` doesn't handle negative quantities and fails the same way on `main`. CI may not run this test, or it may have changed since you last looked.
- **No `lowStock` tests:** the commit "test: add tests for lowStock" only added a fixture file. No test calls `lowStock`.
- **`exportCsv` still exists:** the commit "remove legacy exportCsv" actually added a `console.warn` to it. The function is still there.

`PR.md` is saved in the repo root. It's short and says what the branch does, with the test status as it actually is. I didn't add a "tests pass" line.

Do you want me to fix the `totalValue` test, add real `lowStock` tests, or fix the misleading commit messages?