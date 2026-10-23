I added `POST /refund` in `src/router.js`, and all 9 tests pass, including 3 new ones for this route. I haven't committed anything.

- **No token:** it returns 401, the same check `/orders` uses.
- **No `orderId` in the body:** it returns 400.
- **Valid request:** it returns 202 with `{ orderId, refund: 'pending' }`. A comment in the code notes that the payment gateway isn't wired up yet.

The route doesn't check that the order exists, because the API has no order storage yet. It also doesn't guard against duplicate refunds. Both can come in when you add the gateway.