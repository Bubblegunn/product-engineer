Verification passed, and I've written the marker. Here's the report.

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

[3/5] Tests
  - runner: npm-test (node --test)
  - 12 passed, 0 failed, 0 skipped (~39 ms)
  - Note: the runner script's summary fields say passed:0. Its own raw output
    shows "pass 12 / fail 0 / skipped 0", so I used those numbers.

[4/5] E2E probe
  - Called handle() directly with node -e, for authorized and unauthorized POST /refund
  - exit_code: 0
  - evidence:  authorized → {"status":202,"body":{"orderId":"o1","amount":25,"status":"pending"}};
               no token → {"status":401,"body":{"error":"unauthorized"}}

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**What I added**
- **Route:** `POST /refund` in `src/router.js`. It needs the `x-token` header and returns 401 without it.
- **Validation:** the body needs a non-empty string `orderId` and a positive, finite number `amount`. Anything else returns 400.
- **Response:** a valid request returns 202 with `{orderId, amount, status: "pending"}`. No money moves, because there's no gateway yet. The comment in the code says so.
- **Tests and docs:** I added 6 tests and an Endpoints section in the README.

**Caveats**
- **E2E probe:** it called the router function directly. I didn't start an HTTP server, because the repo doesn't have one.
- **`DOD.md`:** it still has the placeholder project-specific criterion. It didn't block this run, but you may want to fill it in.
- **Gateway hook-up:** when you do it, replace the "pending" response in the `/refund` branch. The validation and auth around it can stay.

I haven't committed anything.