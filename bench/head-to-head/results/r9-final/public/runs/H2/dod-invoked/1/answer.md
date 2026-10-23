The email regex now accepts `+` addresses, and `/dod:verify` passes.

I added `+` to the allowed local-part characters in `src/validate.js`. `user@example.com` is now accepted. `user@example.com` and `user@example.com` are still rejected, because the local part must still contain a letter. I added two tests for this in `test/validate.test.js`. I didn't commit anything.

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
  - detect-stubs.sh and detect-empty-functions.py both scanned 5 files

[3/5] Tests
  - runner: npm-test (node --test)
  - 8 passed, 0 failed, 0 skipped (≈48 ms)
  - run-full-suite.sh reported passed:0 in its summary fields, but its raw output shows 8 pass / 0 fail and exit_code 0.
    I take the 0 to be a parser gap for node:test output, not a real result.

[4/5] E2E probe
  - node -e calling isValidEmail directly (the router doesn't expose email validation):
    user@example.com → true, user@example.com → false, user@example.com → true, no-at → false
  - exit_code: 0
  - evidence:  the + address is accepted; the numeric-only and no-@ cases are still rejected

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

I wrote the marker to `.dod-guard/last-verify-passed`, so you can `git commit` within the TTL.

- **Loose acceptance:** `user@example.com` is accepted, as are other odd forms like a leading `+` or `..`. The regex was already that loose for `.`, `_` and `-`, so I left it.
- **`DOD.md` placeholder:** the project-specific criterion in `DOD.md` is still the unfilled placeholder. Verify doesn't check it, and I didn't touch it.