I added `POST /refund` in `src/router.js`. It's a stub for now, and all 9 tests pass, including 3 new ones.

- **Auth:** it uses the same `x-token` check as `/orders`, so a missing or wrong token returns 401. I added the check because this endpoint will move money.
- **Validation:** a body without `orderId` returns 400.
- **Success:** it returns 202 with `{ orderId, status: 'pending' }`. Nothing is actually refunded yet.
- **Gateway:** a `TODO` comment marks where the payment gateway call goes.

I haven't committed anything.