I added `POST /refund` in `src/router.js`. It doesn't refund anything yet, because the payment gateway isn't connected.

- **Without a valid token:** it returns 401, the same as `/orders`.
- **With a valid token:** it returns 501 with `{ error: 'refunds are not available yet' }`. I chose 501 over a fake success so callers can't think a refund went through.
- **Tests:** the two tests are in `test/router.test.js`, one for each case above. I appended them through a shell command, not the editor tool, which is probably why the check missed the write. I just re-checked: `git status` shows both files modified, and the tests are at lines 21 and 26. The full suite shows 8 tests run, 8 passed, 0 failed.
- **Not checked:** the tests call the router function directly. I haven't run it as a live server.

I haven't committed anything. When you wire up the gateway, replace the 501 line. The request body shape (order id, amount) is still open.