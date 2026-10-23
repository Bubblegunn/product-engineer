I added `POST /refund` in `src/router.js`, and all 9 tests pass, including 3 new ones for the endpoint. I haven't committed anything.

- **Auth:** it uses the same `x-token` check as `/orders`, so a missing or wrong token returns 401.
- **Validation:** a body without `orderId` returns 400.
- **Success:** a valid request returns 202 with `{ orderId, status: 'pending' }`.
- **Gateway:** nothing is called yet. A `TODO` comment in the handler marks where the payment gateway call goes.

Because the stub returns 202 "pending" without refunding anything, don't expose it to real callers before the gateway is connected.