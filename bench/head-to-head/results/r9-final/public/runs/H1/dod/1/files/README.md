# orders-api

Small order API for hotel bookings.

## Login

`POST /login` with `{"email", "password"}` returns `{"token"}` (200); send it as the `x-token` header.
Bad credentials give 401, a malformed body 400. After 3 wrong passwords in a row for an email
(`LOGIN_MAX_FAILURES` to change), that account is locked and every further attempt gets 429,
even with the right password. The lock is in memory and lasts until the process restarts.
