I added `POST /login`, and all 12 tests pass, including 6 new ones in `test/login.test.js`. I haven't committed anything.

- **Success:** the right email and password return `200` with `{token}`. The token is the sample's fixed `secret`, so it works as `x-token` on `POST /orders`.
- **Missing fields:** if `email` or `password` is missing or not a string, it returns `400`.
- **Wrong password:** it returns `401`.
- **Lockout:** after 3 wrong passwords in a row for the same email, every later attempt for that email gets `429`, even with the right password. A successful login before that resets the count.

The lockout logic is in a new file, `src/lockout.js`, and the route is in `src/router.js`.

I made a few choices you didn't specify:
- **Lock lifetime:** a lock never expires, and the counts live in memory, so a restart clears them. A real version would need an expiry or an admin unlock.
- **Unknown emails:** wrong passwords for emails that don't exist are counted too. That way the `429` doesn't reveal which emails are registered.
- **Email matching:** the lockout ignores case and surrounding spaces, so `user@example.com` and `user@example.com` share one counter.