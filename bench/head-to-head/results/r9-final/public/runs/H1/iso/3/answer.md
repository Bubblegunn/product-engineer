I added `POST /login`, and all 12 tests pass (the 6 new ones plus the 6 that were already there). I haven't committed anything.

- **Success:** the right email and password return `200` with `{token}`.
- **Wrong password:** returns `401`.
- **Bad request:** a missing or non-string `email` or `password` returns `400`. Those requests don't count as failed attempts.
- **Lockout:** after 3 wrong passwords in a row for the same email, every later attempt gets `429`, even with the right password. A successful login before the third failure resets the count.

The code is in `src/login.js`, routed from `src/router.js`, with tests in `test/login.test.js`.

- **Token:** the repo's token is a fixed value (`secret`), so `/login` returns that same value. It works with `POST /orders` through the `x-token` header, but it isn't a real per-user token. Real tokens would be a separate change.
- **Lock duration:** you didn't say how long a lock lasts, so it never expires. Unlocking takes a restart.
- **Storage:** counts live in memory, so a restart clears them and they aren't shared across multiple server instances.
- **Unknown emails:** emails that don't exist also get locked after 3 tries. That way a `429` doesn't reveal which accounts are real.

Should the lock expire after some time, such as 15 minutes? That's a small change.