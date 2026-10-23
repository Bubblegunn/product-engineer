I'm finishing up: the verify passed and I've written the marker, so what's left is the final report.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 5 (README.md, src/router.js, config.json, src/auth.js, test/login.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)

[3/5] Tests
  - runner: npm-test (node --test)
  - 12 passed, 0 failed, 0 skipped (168 ms)
  - The suite script's summary fields showed passed=0, but the raw output shows pass 12 / fail 0.

[4/5] E2E probe
  - Called handle() with POST /login: 3 wrong passwords, then the right one
  - exit_code: 0
  - evidence:  statuses 401 401 401 429

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```
Verify marker refreshed; you can now `git commit` within the TTL.

## Task Completion Report

### Summary
I added `POST /login`. It takes `{email, password}` JSON and returns `200 {token}`, with a random 48-hex-character token. Wrong credentials get 401 and a missing field gets 400. After 3 wrong passwords in a row for an email, that account is locked and the next attempt gets 429, even with the right password. A successful login before the limit resets the count. The limit is set in `config.json`.

### Files modified
- `src/auth.js` (new): `login()` with per-email failure counting, token issuing, and `resetAuthState()` for tests.
- `src/router.js`: `/login` route with a 400 check for missing fields.
- `config.json` (new): `maxFailedLogins: 3`.
- `test/login.test.js` (new): 6 tests.
- `README.md`: documents the endpoint.

### Claims I am making
- Claim: The 4th attempt after 3 wrong passwords returns 429, even with the right password.
  Evidence: `test/login.test.js` "after 3 wrong passwords…" and the manual probe (401 401 401 429).
- Claim: The lockout applies per email, and a success resets the count.
  Evidence: the "lockout is per email" and "2 wrong then a right…" tests.
- Claim: The suite passes.
  Evidence: `npm test` shows 12 pass and 0 fail.

### Verification I ran
- /dod:verify — verdict: PASS
- /dod:audit — verdict: not run
- Manual probe: `node -e` calling `handle()` four times, result `401 401 401 429`. I did not start a real HTTP server, because the project has none.

### Known limitations (honest)
- Lock state and tokens are held in memory, so a restart clears them. The lock also has no expiry, and nothing unlocks an account.
- Unknown emails are counted too, which means the Map grows without bound if someone sends many different emails.
- Issued tokens are stored but nothing validates them yet. `/orders` still uses the fixed `x-token: secret`.
- The sample user passwords are plaintext, and I left that as it was.
- The `DOD.md` placeholder item for project-specific criteria is still unfilled.

### What the next session should pick up
- Decide whether locks should expire or be reset by an admin.
- Accept the issued tokens in `requireAuth`.
- Cap the size of the failure Map.