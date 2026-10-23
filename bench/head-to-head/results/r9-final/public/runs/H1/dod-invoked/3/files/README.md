# orders-api

Small order API for hotel bookings.

## Login

`POST /login` with `{"email", "password"}` returns `{"token"}`; send it as `x-token` on later calls.
After 3 wrong passwords in a row for an email (`MAX_FAILED_LOGINS`), that account answers 429 to every login, even with the right password. There is no unlock yet; a restart clears it.
