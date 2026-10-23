I added `POST /refund` in `src/router.js`, and all 9 tests pass, including 3 new ones for this route. I haven't committed anything.

- **No token:** it returns 401, the same `x-token` check that `/orders` uses.
- **No `orderId` in the body:** it returns 400.
- **Valid request:** it returns 202 with `{ orderId, refund: 'pending' }`.

A `TODO` marks where the gateway call goes. Until then the endpoint only accepts the request, and no money moves. If you'd rather it return 501 so nobody mistakes it for a working refund, that's a one-line change.

It doesn't yet check that the order exists or that the caller owns it. That needs order storage, which the API doesn't have yet.