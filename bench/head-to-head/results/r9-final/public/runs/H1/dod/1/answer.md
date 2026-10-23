I added `POST /login`, and all 13 tests pass (`npm test`). I haven't run `/dod:verify`, and I didn't probe it over real HTTP. The tests call the router directly.

- **Success:** the right email and password return 200 with `{token}`. The token is random and works as the `x-token` header on `POST /orders`. The old fixed `secret` token still works.
- **Failures:** a wrong password returns 401, and a body missing the email or password returns 400.
- **Lockout:** after 3 wrong passwords in a row for the same email, every later attempt returns 429, even with the right password. A successful login before the third failure resets the count. Locks are per email.

The lockout state is in memory and never expires, so an account stays locked until the process restarts. You didn't say how it should unlock, so I left that out. If you want a timed unlock or an admin reset, say which.

Emails are trimmed and lowercased before the lockout check. Unknown emails also count toward a lock, so a lock doesn't reveal whether an account exists. The 3-attempt limit can be changed with the `LOGIN_MAX_FAILURES` environment variable.

The logic is in `src/login.js`, wired into `src/router.js`, with tests in `test/login.test.js` and a short note in `README.md`. I haven't committed anything.