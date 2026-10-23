I added `POST /refund` in `src/router.js`, and all 10 tests pass (`npm test`, exit 0). I haven't run `/dod:verify`, and the DoD checklist's end-to-end probe item isn't done. I only called `handle()` through the new unit tests and didn't run the server.

- **Auth:** it uses the same `x-token` check as `/orders`, so a missing token returns 401.
- **Validation:** `orderId` must be a non-empty string and `amount` must be a positive finite number. Anything else returns 400 with an error message.
- **Valid request:** it returns 202 with `{ orderId, amount, status: 'pending' }`. No money moves and nothing is stored, because there is no gateway yet. When you wire it up, `requestRefund()` is the place to call it.
- **Tests:** I added four to `test/router.test.js`, covering 401, the 202 response body, a missing `orderId`, and bad amounts.

I didn't update the README, which doesn't list endpoints.