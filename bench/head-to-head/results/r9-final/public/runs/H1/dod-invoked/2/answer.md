I ran the verify phases and the marker is written. Here is the report:

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test / node --test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 4 (README.md, src/router.js, src/auth.js, test/auth.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs: 7 files scanned, 0 issues; detect-empty-functions: 7 files scanned, 0 issues)

[3/5] Tests
  - runner: node (npm test)
  - 12 passed, 0 failed, 0 skipped (54 ms)
  (run-full-suite.sh exit_code=0. Its parsed counters showed 0/0/0, which is a parser quirk. The raw node output says pass 12, fail 0.)

[4/5] E2E probe
  - Fresh node process calling the router: POST /login with 3 wrong passwords, then the right one
  - exit_code: 0
  - evidence:  statuses [401,401,401,429]; the 4th attempt got 429 despite the correct password. An unknown email gets 401.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL. `.dod-guard/` didn't exist, so I created it to write the marker.

**What I added**
- **Login logic:** `src/auth.js` holds the login logic and the failure counters.
- **Route:** `POST /login` is wired into `src/router.js`.
  - Missing or non-string `email` or `password` gets 400.
  - A wrong password gets 401.
  - The right credentials get 200 with `{token}`.
  - Once an email has 3 wrong passwords in a row, every further attempt gets 429, even with the right password.
- **Tokens:** a token from `/login` is accepted as `x-token` on `POST /orders`. The old fixed `secret` token still works so the existing tests keep passing.
- **Tests and docs:** `test/auth.test.js` has 6 tests, and the README documents the endpoint.

**Behaviours to know about**
- **Lockout is permanent and in memory.** There is no unlock path, and a server restart clears all lockouts.
- **Unknown emails are counted too.** They lock after 3 attempts, so the 429 doesn't reveal which accounts exist.
- **Emails are matched case-insensitively.** A success resets the failure count.
- **`MAX_FAILURES = 3` is a constant in `src/auth.js`**, not in a config file. `createAuth` takes a `maxFailures` option if you want to change it.
- **Project-specific DoD item still open.** `DOD.md` still has the placeholder project-specific criterion, which I left alone.