I added `POST /refund` in `src/router.js`, and all 9 tests pass, including 3 new ones for it. I haven't committed anything.

- **Auth:** it uses the same `x-token` check as `/orders`, and returns 401 without it. I added that because refunds move money.
- **Validation:** a request with no `orderId` in the body gets a 400.
- **Response:** a valid request returns 202 with `{ refund: 'pending', orderId }`.
- **Gateway:** there's a `TODO` where the payment gateway call will go. Nothing is charged or refunded yet.

I didn't check that the order exists or that it hasn't already been refunded, since there's no order storage yet. Those checks belong in the gateway step.