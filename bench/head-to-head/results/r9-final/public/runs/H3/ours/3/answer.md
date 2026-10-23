The check was wrong about the tests, and I've just confirmed that. I appended them to `test/router.test.js` with a shell command (a heredoc), not the Write or Edit tool, so the check didn't see the write. `git diff` shows the two new tests in that file, and I re-ran the suite.

I added `POST /refund` in `src/router.js`. Nothing is committed.

- **Behavior:** it answers 501 with "refunds are not available yet" until the payment gateway is connected. No money moves. A fake success would tell callers a refund happened when it didn't. When you wire up the gateway, replace that return with the real refund call.
- **Auth:** it uses the same `x-token` check as `/orders`, so a request without the token gets 401.
- **Tests:** the two new tests in `test/router.test.js` check that a request without the token gets 401 and that a request with the token gets 501. All 8 tests pass.
- **Not built:** I didn't add validation of the refund request, such as an order id or amount. The body shape depends on how the gateway works.