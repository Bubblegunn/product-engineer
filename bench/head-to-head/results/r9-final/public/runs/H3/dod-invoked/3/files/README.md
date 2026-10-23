# orders-api

Small order API for hotel bookings.

## Endpoints

- `GET /health`
- `POST /orders` (x-token required)
- `POST /refund` (x-token required): body `{orderId, amount}`; returns 201 with a refund in `pending` status. No payment gateway is connected yet, so refunds are only recorded.
