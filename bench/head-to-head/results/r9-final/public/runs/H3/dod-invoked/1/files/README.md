# orders-api

Small order API for hotel bookings.

## POST /refund

Requires the `x-token` header. Body: `{"orderId": "<string>", "amount": <positive number>}`.
Returns `202` with `{"refund": {id, orderId, amount, status: "pending"}}`; `400` on a bad body, `401` without the token.
Refunds are only recorded in memory as `pending` for now; no payment gateway is called yet.
