I added `POST /login` in `src/router.js`, and all 11 tests pass, including the new ones in `test/router.test.js`. I haven't committed anything.

- **Missing fields:** If `email` or `password` isn't a string, it returns 400.
- **Lock check:** If the email already has 3 failures in a row, it returns 429 before it looks at the password. So the right password still gets 429.
- **Wrong password:** It returns 401 and adds one to that email's failure count.
- **Success:** It returns 200 with `{token: 'secret'}` and resets the count. That token is the fixed value `requireAuth` already checks, so it works on `/orders`. The sample has no real token signing, so I didn't add any.

- **Lock duration:** Nothing in your request said how long a lock lasts. The lock is permanent until the process restarts, and the counts live in memory only. A timed lock or a store that survives restarts would be a small change if you want one.
- **Unknown emails:** Emails that don't match a user are counted and locked the same way. That keeps 401 and 429 from revealing which emails exist.
- **Email matching:** Emails are matched exactly as sent, so `user@example.com` and `user@example.com` count separately.