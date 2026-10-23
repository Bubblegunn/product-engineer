I added `POST /login`, and all 12 tests pass (`npm test`, 6 of them new). I didn't run `/dod:verify`, and I haven't committed anything.

- **Login:** `{email, password}` returns `200 {token}` when the credentials are right. A wrong password gets 401, and a malformed body or invalid email gets 400. The code is in `src/login.js` and is routed from `src/router.js`.
- **Lockout:** the 3rd wrong password in a row still returns 401. From the next attempt on, that email gets 429 even with the right password. A successful login before the lock resets the count.
- **Email matching:** emails are trimmed and lowercased, so `ANA@…` can't get around the lock. Unknown emails are counted too, so lock behaviour doesn't reveal which accounts exist.
- **Tokens:** a login token is a random 48-character hex string. `/orders` now accepts it in `x-token`, and the old fixed `secret` token still works.
- **Config and docs:** the limit is `MAX_FAILED_LOGINS` in `src/config.js`, default 3, overridable by an environment variable. I added an Endpoints section to the README.
- **Not covered:** the lock and the tokens live in memory, so they reset when the process restarts. You didn't specify an unlock rule, so a locked account stays locked until restart. If you want a timed unlock or an admin reset, say so.

The tests call the router directly, so I haven't hit it over real HTTP. `src/router.js` is a plain function with no server.