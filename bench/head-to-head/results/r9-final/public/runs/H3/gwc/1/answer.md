I added `POST /refund` in `src/router.js`, and all 9 tests pass, including three new ones in `test/router.test.js`.

- **Auth:** it uses the same `x-token` check as `/orders`, so a missing or wrong token returns 401.
- **Validation:** a body without `orderId` returns 400.
- **Success:** it returns 202 with `{ refund: 'pending', orderId }`. Nothing is actually refunded yet. A `TODO` marks where the gateway call goes once it's wired up.

I haven't committed anything.