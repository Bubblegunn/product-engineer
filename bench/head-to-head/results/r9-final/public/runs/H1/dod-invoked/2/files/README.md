# orders-api

Small order API for hotel bookings.

## POST /login

Body `{email, password}` returns `200 {token}`; send it as `x-token` on `POST /orders`. Bad credentials are `401`, missing fields `400`. After 3 wrong passwords in a row for an email, that account is locked and further attempts return `429`, even with the right password. Lockout is in memory and has no unlock yet.
