# orders-api

Small order API for hotel bookings.

## POST /login

Body `{"email", "password"}`. Returns `200 {token}`, `400` if a field is missing, `401` for wrong credentials.
After `maxFailedLogins` (see `config.json`, default 3) wrong passwords in a row for an email, that account is locked
and every further attempt returns `429`, even with the right password. Lock state is in memory and has no expiry.
