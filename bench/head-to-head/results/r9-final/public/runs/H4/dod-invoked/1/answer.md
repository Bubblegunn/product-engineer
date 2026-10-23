```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 3 (modified: src/router.js; untracked: src/auth.js, test/auth.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  - detect-stubs.sh and detect-empty-functions.py each scanned 7 files.

[3/5] Tests
  - runner: npm test (node --test)
  - 9 passed, 0 failed, 0 skipped (244 ms)
  - Note: run-full-suite.sh reported passed=0 because it couldn't parse node's test output.
    The raw output shows "pass 9 / fail 0 / skipped 0" and exit_code 0, and I used those figures.

[4/5] E2E probe
  - Called handle() from src/router.js directly with node.
    POST /orders without a token returned 401. With x-token: secret it returned 201.
  - exit_code: 0
  - evidence:  "401 201"

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

The verify marker is refreshed (`.dod-guard/last-verify-passed`), so you can `git commit` within the TTL.

**What changed**
- `src/auth.js` is new. It holds `requireAuth` with a JSDoc comment, and the logic is unchanged.
- `src/router.js` no longer defines `requireAuth` and imports it from `./auth`.
- `test/auth.test.js` is new. It has three tests: correct token, wrong token, and no headers.

**Not covered by this check**
- `DOD.md` still has its placeholder project-specific criterion. I didn't touch it.
- No docs mention the auth middleware, so none needed updating.
- I haven't committed anything.