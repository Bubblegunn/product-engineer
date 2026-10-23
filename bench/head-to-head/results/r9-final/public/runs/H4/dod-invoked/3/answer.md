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
  - detect-stubs.sh and detect-empty-functions.py each scanned 7 files.

[3/5] Tests
  - runner: npm-test (node --test)
  - 9 passed, 0 failed, 0 skipped (223 ms)
  - The script's summary JSON reported passed=0. Its raw output shows "pass 9 / fail 0", so the script's parser miscounted. The exit code was 0.

[4/5] E2E probe
  - Called handle() from src/router.js directly, with POST /orders.
  - exit_code: 0
  - evidence:  With no token it returned 401 {"error":"unauthorized"}. With x-token=secret it returned 201 {"created":true}.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**What changed:** I moved `requireAuth` out of `src/router.js` into the new `src/auth.js`, with a JSDoc comment. The router now imports it, and behavior is unchanged. I added `test/auth.test.js` with three tests: correct token, wrong token, and missing headers.

**Left open from DOD.md:**
- The project-specific placeholder item in `DOD.md` is still unfilled.
- The `secret` token is still hardcoded, as it was before. I moved it as-is rather than changing behavior.
- The README doesn't mention auth, so there was nothing to update.

I haven't committed anything.