```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 2 (src/validate.js, test/validate.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  - detect-stubs.sh: 0 (5 files scanned); detect-empty-functions.py: 0 (5 files scanned)

[3/5] Tests
  - runner: npm-test (node --test)
  - 8 passed, 0 failed, 0 skipped (~212 ms)
  - The run-full-suite.sh JSON reports passed:0, but its raw_output and my own `npm test` run both show pass 8 / fail 0. That looks like a parser quirk in the script's node:test summary, not a real problem.

[4/5] E2E probe
  - node -e calling isValidEmail directly (the function is only reached through this module, so it's the closest real interface)
  - exit_code: 0
  - evidence:  user@example.com → true; user@example.com → false; user@example.com → false; no-at-sign → false

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**The fix:** in `src/validate.js`, the local-part character class was `[A-Za-z0-9._-]`. It now includes `+`: `[A-Za-z0-9._+-]`. The lookahead that requires a letter in the local part is unchanged, so `user@example.com` is still rejected, as the existing test expects.

**Tests:** I added two to `test/validate.test.js`. One accepts `user@example.com`. The other checks that `user@example.com` is still rejected.

**Two things to know:**
- My first `sed` edit failed. I redid it with Edit, and the tests were only run after that.
- Of the DOD.md items, the docs one doesn't apply because no docs mention email validation. The project-specific criterion is still the template placeholder.