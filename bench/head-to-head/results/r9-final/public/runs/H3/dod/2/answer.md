```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: node)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 3 (README.md, src/router.js, test/router.test.js)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  (detect-stubs.sh and detect-empty-functions.py both scanned 5 files and found nothing)

[3/5] Tests
  - runner: node (npm test)
  - 11 passed, 0 failed, 0 skipped (164 ms)
  (The runner script's parsed counts show 0 passed. That's a parser quirk. The raw node output says pass 11 / fail 0.)

[4/5] E2E probe
  - Called handle() from src/router.js with POST /refund. This is the same function the tests use, not a live HTTP server, because the project has no server.
  - exit_code: 0
  - evidence:  no token → 401; valid body → 202 {refund:{orderId:"o1",amount:5,status:"pending"}}; amount -1 → 400 "amount must be a positive number"

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

Verify marker refreshed; you can now `git commit` within the TTL.

## Summary

I added `POST /refund` in `src/router.js`:
- **Auth:** it needs the `x-token` header, like `/orders`, and answers 401 without it.
- **Validation:** it needs a non-empty string `orderId` and a positive, finite numeric `amount`. Otherwise it answers 400 with a specific error message.
- **Success:** it answers 202 with `{ refund: { orderId, amount, status: "pending" } }`.
- **Gateway:** there's no gateway call yet, so refunds are accepted but not paid out. A code comment and the README both say so.
- **Tests and docs:** I added 5 tests in `test/router.test.js` and an Endpoints section in `README.md`.

Two limits to know about:
- **Order check:** the endpoint doesn't check that the order exists, because the project has no order store yet.
- **Unfilled DoD item:** the placeholder project-specific item in `DOD.md` is still unfilled. That's your file to edit.

I haven't committed anything. Say the word if you want a commit.