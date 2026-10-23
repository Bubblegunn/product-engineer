**System purpose:** `POST /refund` now accepts and validates refund requests. It does not move any money, because the payment gateway is not connected yet. All 10 tests pass, including the 4 new ones.

**Implementation detail:** The route is in [`router.js:L15-L24`](file://<WORK>/runs/H3-iso-invoked-3/repo/src/router.js#L15-L24). It follows the same pattern as `POST /orders`.

| Condition | Status | Body |
|---|---|---|
| Missing or wrong `x-token` header | 401 | `{ error: 'unauthorized' }` |
| `orderId` missing | 400 | `{ error: 'orderId is required' }` |
| `amount` not a positive number | 400 | `{ error: 'amount must be a positive number' }` |
| Valid request | 202 | `{ orderId, amount, status: 'pending' }` |

I chose 202 (Accepted) over 201 because a refund is not complete until the gateway confirms it.

**Your next step:** Replace the comment at [`router.js:L21`](file://<WORK>/runs/H3-iso-invoked-3/repo/src/router.js#L21) with the gateway call when it is ready.

**Open choices:**
- **Order check:** The route does not check that `orderId` exists, because the sample has no order storage yet.
- **Amount limit:** The route does not check that `amount` is at most the order total, for the same reason.

The new tests are in [`router.test.js`](file://<WORK>/runs/H3-iso-invoked-3/repo/test/router.test.js). I have not committed the changes.