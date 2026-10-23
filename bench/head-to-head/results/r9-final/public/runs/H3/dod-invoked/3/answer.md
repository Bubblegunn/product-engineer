I've added `POST /refund`, and `/dod:verify` passes. Nothing is committed.

```
═════════════════════════════════════════════════════════════
DoD-Guard verify  (project: orders-api, runner: npm-test)
═════════════════════════════════════════════════════════════
[1/5] Snapshot
  - branch:        main
  - HEAD:          f555c4d
  - dirty:         yes
  - changed files: 4 (README.md, src/router.js, test/router.test.js modified; src/refunds.js new)

[2/5] Stubs & incomplete code
  - 0 stub-style issue(s)
  - detect-stubs.sh: 0 issues in 6 files
  - detect-empty-functions.py: 0 issues in 6 files

[3/5] Tests
  - runner: npm-test (node --test)
  - 9 passed, 0 failed, 0 skipped (179 ms)
  - exit_code: 0. The script's own pass/fail counters read 0 because it didn't parse node's output. The raw output shows 9 tests, 9 pass.

[4/5] E2E probe
  - node -e calling handle() directly. The repo has no HTTP server, so there is nothing to curl.
  - exit_code: 0
  - evidence: valid body gives 201 {"id":1,"orderId":"o1","amount":12.5,"status":"pending"}; amount -1 gives 400; no token gives 401

[5/5] Verdict
  ═══════════════════════════════════════════════════════════
  VERDICT: PASS
  ═══════════════════════════════════════════════════════════
```

The verify marker is refreshed (`.dod-guard/last-verify-passed`), so a `git commit` within the TTL is allowed.

**What changed**
- **`src/refunds.js`:** new `createRefund({orderId, amount})`. It requires a non-empty string `orderId` and a positive finite `amount`, and stores the refund in memory with status `pending`.
- **`src/router.js`:** `POST /refund` follows the same `x-token` check as `/orders`. It returns 401 without the token, 400 on invalid input, and 201 with the refund otherwise.
- **`test/router.test.js`:** 3 new tests cover 401, the 201 and pending result, and the 400 cases.
- **`README.md`:** new endpoints section.

**Gateway:** no gateway code or placeholder exists. Refunds are only recorded as `pending`, and the README says so. When you wire up the gateway, the hook point is `createRefund`.

**Limitations**
- Refunds live in an in-memory array, so they reset on restart.
- Nothing checks that the order exists, because there is no order store yet.
- The same order can be refunded more than once, and the amount isn't capped at the order total.
- `DOD.md` still has its placeholder project-specific criterion. I didn't touch it.
- I created `.dod-guard/` to hold the marker, since it didn't exist.