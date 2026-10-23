I've moved the auth middleware into its own module, and `/dod:verify` passed.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 3 (src/router.js modified; src/auth.js and test/auth.test.js new)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs.sh and detect-empty-functions.py each scanned 7 files)

[3/5] Tests
  - runner: npm-test (node --test)
  - 9 passed, 0 failed, 0 skipped (188 ms)
  (The runner script's JSON summary reported passed=0. Its raw output shows
   "pass 9 / fail 0" with exit_code 0, so the 0 looks like a parsing gap in
   the script, not a real result.)

[4/5] E2E probe
  - handle() called directly through ./src/router, since there is no server to curl
  - exit_code: 0
  - evidence:  POST /orders without a token gave 401 {"error":"unauthorized"}; with x-token=secret it gave 201 {"created":true}

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**What changed**
- **`src/auth.js`:** new file holding `requireAuth`, now with a JSDoc comment, exported.
- **`src/router.js`:** the local definition is gone and `requireAuth` is imported from `./auth`. Behavior is unchanged.
- **`test/auth.test.js`:** three new tests for the correct token, a wrong token, and missing headers.

**Not covered**
- The README doesn't mention auth, so I didn't change it.
- The placeholder project-specific item in `DOD.md` is still unfilled. That's an existing placeholder, not something this change introduced.
- I haven't committed anything.