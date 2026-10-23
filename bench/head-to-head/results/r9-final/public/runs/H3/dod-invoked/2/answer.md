```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test / node --test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 3 (README.md, src/router.js, test/router.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs.sh and detect-empty-functions.py each scanned 5 files and found nothing)

[3/5] Tests
  - runner: npm-test (node --test)
  - 10 passed, 0 failed, 0 skipped (177 ms)
  - Note: the runner's JSON summary reported 0/0/0 because it can't parse node's output. The 10 passed, 0 failed figures come from the raw output, which lists 4 new /refund tests plus 6 existing ones. Exit code 0.

[4/5] E2E probe
  - Called handle() directly with node -e, using the same interface the tests use. This is not an HTTP request: the repo has no server.
    - Authed POST /refund with {orderId:'o1', amount:12.5} returned {"status":202,"body":{"id":1,"orderId":"o1","amount":12.5,"status":"pending"}}
    - POST /refund without a token returned {"status":401,"body":{"error":"unauthorized"}}
  - exit_code: 0
  - evidence:  202 with a pending refund record for the authed call, 401 for the unauthed call

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

**What I added**
- `POST /refund` in `src/router.js` needs the `x-token` header, like `/orders`.
- The body must be `{orderId, amount}`. A missing or empty `orderId`, or an `amount` that isn't a positive finite number, returns 400.
- A valid request returns 202 with `{id, orderId, amount, status: 'pending'}`.
- Refunds are held in an in-memory list. Nothing is sent to a payment gateway, so no money moves. When you wire up the gateway, that is where it plugs in, and `pending` is the status to update.
- I added four tests covering the 401, the valid 202, the missing `orderId`, and the bad amounts. The README now lists the endpoints.

**Open items**
- The refund list resets on restart, and nothing checks that the order exists or that the refund is within its total. Both need decisions once real order storage and the gateway exist.
- I haven't committed anything.

**Unmet DOD.md items**
- The one remaining item in DOD.md is a placeholder (`replace this placeholder with a real project-specific criterion`).
- `createRefund` has a comment, but I didn't add JSDoc-style docs.