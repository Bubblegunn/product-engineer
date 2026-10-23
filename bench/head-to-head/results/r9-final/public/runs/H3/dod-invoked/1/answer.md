I added `POST /refund`, and `/dod:verify` passed. The refund is only recorded in memory as `pending`; no gateway is called, so no money moves yet.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 3 (README.md, src/router.js, test/router.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs.sh and detect-empty-functions.py each scanned 5 files)

[3/5] Tests
  - runner: node (npm test)
  - 12 passed, 0 failed, 0 skipped (177 ms)
  - The runner's JSON summary reported passed: 0. Its raw output
    shows "pass 12 / fail 0", so I took the counts from there. The
    script's parsing of node:test output looks wrong.

[4/5] E2E probe
  - Called handle() directly from node with three POST /refund requests
  - exit_code: 0
  - evidence:  no token gave 401. A valid body gave 202 with
    {"refund":{"id":1,"orderId":"o1","amount":5,"status":"pending"}}.
    amount -1 gave 400.
  - This calls the router function, not a running server. The project has no server entrypoint.

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL. Nothing is committed yet.

**What changed**
- **Route:** `/refund` in `src/router.js` uses the same `x-token` check as `/orders`.
- **Validation:** `orderId` must be a non-empty string and `amount` a positive finite number.
- **Responses:** `400` for a bad body, `401` without the token, `202` with the pending refund otherwise.
- **Tests:** 6 new ones in `test/router.test.js` covering auth, the happy path, unique ids, and bad input.
- **Docs:** `README.md` describes the endpoint and says refunds stay pending until a gateway is connected.

**Not done**
- Refunds are not tied to real orders. `POST /orders` doesn't store anything, so `/refund` can't check that `orderId` exists or that the amount is within what was paid.
- The in-memory refund list is lost on restart.
- The placeholder project-specific item in `DOD.md` is still unfilled. It's a template line, not something the detectors check.