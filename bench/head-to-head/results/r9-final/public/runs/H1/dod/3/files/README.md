# orders-api

Small order API for hotel bookings.

## Endpoints

- `GET /health` — liveness.
- `POST /login` — body `{email, password}`; 200 `{token}` (send as `x-token`), 400 bad input, 401 wrong credentials. After 3 wrong passwords in a row (`MAX_FAILED_LOGINS`) the account is locked and every further attempt gets 429, even with the right password. Lock lasts for the process lifetime.
- `POST /orders` — requires `x-token`.
