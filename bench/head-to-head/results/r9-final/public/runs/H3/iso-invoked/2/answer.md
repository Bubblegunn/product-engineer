`POST /refund` is in place, and all 10 tests pass. I haven't committed anything.

## What it does

The route is in [router.js:L19-L27](file://<WORK>/runs/H3-iso-invoked-2/repo/src/router.js#L19-L27). It follows the pattern of `POST /orders`.

- **Auth:** A request without a valid `x-token` gets `401`.
- **Validation:** A missing `orderId`, or an `amount` that isn't a positive number, gets `400`.
- **Success:** A valid request gets `202` with `{ orderId, amount, status: 'pending' }`.

## Payment gateway

The route does not call a gateway. The `202` status and the `pending` value show that the refund is accepted but not processed. When you add the gateway, replace the `return` on the last line of the route with the gateway call. Then set the status from the gateway's result.

## Tests

I added four tests to [router.test.js](file://<WORK>/runs/H3-iso-invoked-2/repo/test/router.test.js). They cover the missing token, the missing `orderId`, the zero `amount`, and the valid request.

## Open decision

The route doesn't check that the order exists, because the API has no order storage yet. Add that check when orders are saved.