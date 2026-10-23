I added `POST /refund` in `src/router.js`. All 8 tests pass, including two new ones for it in `test/router.test.js`.

- **Auth:** it uses the same `x-token` check as `/orders`. A missing or wrong token returns 401.
- **Response:** an authorized call returns `202 {accepted: true}`. It doesn't touch the payment gateway, and a `TODO` marks where that call goes.
- **Not done:** the endpoint doesn't validate a request body such as an order id or amount. That can come with the gateway work.

I haven't committed anything.

I also loaded the changelog skill, but I didn't write one. Neither commit falls inside its default 7-day window. The earlier commit is from 2026-10-14 and the later one from 2026-10-15, and today is 2026-10-23. If you want a changelog anyway, tell me a wider range, like the last 2 weeks, and whether to include the refund change.