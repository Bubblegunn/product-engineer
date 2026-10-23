# orders-api

Small order API for hotel bookings.

## Endpoints

- `GET /health` — liveness check.
- `POST /orders` — create an order (needs `x-token`).
- `POST /refund` — request a refund (needs `x-token`). Body: `{ "orderId": string, "amount": positive number }`.
  Answers `202` with `{ orderId, amount, status: "pending" }`; `400` on a bad body; `401` without the token.
  No payment gateway is connected yet, so no money moves; the refund is only reported as pending.
