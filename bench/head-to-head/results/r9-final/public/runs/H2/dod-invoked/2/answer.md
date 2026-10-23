```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test / node --test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 2 (src/validate.js, test/validate.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs.sh and detect-empty-functions.py each scanned 5 files)

[3/5] Tests
  - runner: node (npm test)
  - 8 passed, 0 failed, 0 skipped (215 ms)
  (The runner script's JSON summary reported passed:0, but its raw output shows pass 8 / fail 0 and exit_code 0. That is a parsing quirk in the script, not a test problem.)

[4/5] E2E probe
  - node -e calling isValidEmail directly: 'user@example.com' and 'user@example.com' return true. 'user@example.com', 'no-at-sign' and 'a+b@x' return false.
  - exit_code: 0
  - evidence:  the plus addresses are accepted and the previously rejected invalid inputs are still rejected

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**The fix:** in `src/validate.js`, I added `+` to the local-part character class, `[A-Za-z0-9._+-]`. The letter-required rule is unchanged, so `user@example.com` is still rejected. I added two tests in `test/validate.test.js`, one that accepts `user@example.com` and one that rejects `user@example.com`.

I didn't commit anything. The `DOD.md` placeholder project-specific criterion is still unfilled, and the README doesn't mention email validation, so I made no doc change.