```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: fetchkit, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          4fa8b8b
  - dirty:         no (before RELEASE_NOTES.md was written)
  - changed files: 0

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node --test)
  - 2 passed, 0 failed, 0 skipped (255 ms)
  - The script's summary counts read 0, but its raw output shows 2 tests passed.

[4/5] E2E probe
  - node -e: called fetchAll with { limit: 2 } and withRetry(() => 'ok'), then printed the config
  - exit_code: 0
  - evidence:  fetchAll returned [1, 2], withRetry returned 'ok', config is { timeoutMs: 45000, limit: 100, retries: 2 }

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
  Verify marker refreshed; you can now `git commit` within the TTL.
```

I wrote `RELEASE_NOTES.md`. It is untracked and I haven't committed it. It covers four points:
- **Breaking change:** `maxItems` is now `limit`, with no alias. Anyone still passing `maxItems` silently gets the default of 100.
- **New:** the `withRetry` helper, which you call yourself. `fetchAll` doesn't use it.
- **Changed:** the default timeout is now 45 seconds, up from 30.
- **Not included:** CSV export was added and then reverted, so it isn't in v1.3.0.

Things in the repo that don't match the release, which you may want to fix:
- **README:** it says "Supports CSV export of reports", which is false for v1.3.0.
- **Timeout:** the commit message says 60s, but the code sets 45000 ms. I wrote 45 seconds because that's what the code does.
- **`package.json`:** the version is still `1.2.0`.
- **Tests:** `withRetry` has no tests, which DoD.md requires for new code paths. The detectors don't check for this, so verify still passed.