I added `POST /login`, and all 10 tests pass, including four new ones for login. I haven't committed anything.

- **Request handling:** `POST /login` takes `{email, password}` and returns `200 {token}` on success. Bad credentials get `401`, and a body missing a string email or password gets `400`.
- **Token:** it returns the fixed `'secret'` value that `/orders` already checks in `x-token`, so a login token works there. This is still the sample's fixed token, not a per-user one.
- **Lockout:** the lockout logic is in `src/users.js` and the route is in `src/router.js`. After 3 wrong passwords in a row for an email, every later attempt gets `429`, even with the right password. A successful login before that point resets the count.
- **Email matching:** emails are trimmed and lowercased when counting failures, so `user@example.com` can't be used to dodge the lock.

A few behaviours you may not expect:
- The lock is permanent, because you didn't ask for an unlock or expiry. It's also held in memory only, so a restart clears it.
- Failures are counted for any email, including ones that don't exist. That way a `429` doesn't reveal which accounts are real, but the failure map can grow without limit.

If you want a timed unlock, say so.