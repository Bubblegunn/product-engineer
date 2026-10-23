`POST /login` now works as you described, and all 12 tests pass, including the 6 new ones in `test/login.test.js`. I haven't committed anything.

- **Success:** the right email and password return 200 with `{token}`. The token is the fixed `'secret'` that `/orders` already accepts through `x-token`, so a login token works on `/orders`. There's no real token system yet.
- **Bad input:** a body without string `email` and `password` returns 400.
- **Wrong password:** returns 401 and adds one to that email's failure count.
- **Lock:** after 3 wrong passwords in a row, the next attempt for that email returns 429, even with the right password. The lock check runs before the password check.
- **Reset:** a successful login resets the count. Emails are counted case-insensitively, so changing the case doesn't get around the lock.
- **Unknown emails:** these are counted and locked the same way. That means the response doesn't reveal whether an account exists.

The lock has no expiry, and the counts live in memory, so they reset when the process restarts. You didn't specify an unlock rule, so a timed unlock or an admin reset would be a follow-up.

The logic is in the new `src/login.js`, with a route added in `src/router.js`.