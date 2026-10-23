I added `POST /refund` in `src/router.js`, and all 9 tests pass, including 3 new ones for this route.

- **Auth:** it uses the same `x-token` check as `/orders`, so a missing or wrong token gets 401.
- **Validation:** the body needs an `orderId`. Without one, it returns 400.
- **Response:** a valid request returns 202 with `{ orderId, refund: 'pending' }`. This is a stub, so no refund is processed. A `TODO` comment marks where the payment gateway call goes.

I haven't committed anything.