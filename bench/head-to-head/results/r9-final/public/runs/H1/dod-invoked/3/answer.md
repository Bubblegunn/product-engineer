Wrapping up the verify run and posting the report now.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 5 (README.md, src/router.js modified; src/auth.js, src/config.js, test/auth.test.js new)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)  (detect-stubs: 0, detect-empty-functions: 0; 8 files scanned)

[3/5] Tests
  - runner: node (npm test)
  - 12 passed, 0 failed, 0 skipped (~41 ms)
  - Note: the suite script's JSON reported passed:0 (its parser missed node's output), but exit_code was 0 and the raw output shows 12 pass / 0 fail.

[4/5] E2E probe
  - node script calling the router: 3 wrong passwords, then the right one; then a fresh login used on /orders
  - exit_code: 0
  - evidence:  statuses 401 401 401 429 (locked even with the right password); fresh login 200, /orders with the issued token 201

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

## What I built

- `POST /login` takes `{email, password}` and returns `{token}`.
  - A body missing either field gets 400.
  - Wrong credentials get 401.
  - Once an email has 3 wrong passwords in a row, every later login for it gets 429, even with the right password.
  - A successful login resets the count.
  - Unknown emails are counted too, so the 429 doesn't reveal which accounts exist.
- Tokens are random 48-character hex strings. `/orders` now accepts an issued token as well as the old fixed `secret`.
- The limit is `MAX_FAILED_LOGINS` in `src/config.js`. It defaults to 3 and can be overridden with an env var.
- Code is in `src/auth.js` and `src/router.js`, with 6 new tests in `test/auth.test.js` and a README section.

## Things to know

- **No unlock:** the lock is permanent until the process restarts, because you didn't specify an unlock rule. Failure counts and tokens live in memory only.
- **Plaintext passwords:** passwords are still compared as plain text, as in the existing sample `users.js`.
- **Placeholder DoD item:** `DOD.md` still has its placeholder project-specific criterion. I didn't touch it.

I haven't committed anything.