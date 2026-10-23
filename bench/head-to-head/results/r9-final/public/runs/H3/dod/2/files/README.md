# orders-api

Small order API for hotel bookings.

## Endpoints

- `GET /health` — liveness check.
- `POST /orders` — create an order (needs `x-token`).
- `POST /refund` — request a refund (needs `x-token`). Body: `{ "orderId": string, "amount": number > 0 }`.
  Answers `202` with `{ refund: { orderId, amount, status: "pending" } }`. No payment gateway is connected yet,
  so refunds are accepted but not paid out.
