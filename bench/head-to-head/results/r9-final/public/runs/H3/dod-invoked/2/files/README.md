# orders-api

Small order API for hotel bookings.

## Endpoints

- `GET /health`
- `POST /orders` (needs `x-token`)
- `POST /refund` (needs `x-token`): body `{orderId, amount}`. Validates and records the request as `pending` (202). No money moves until a payment gateway is connected.
