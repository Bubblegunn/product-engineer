I added `POST /login`, and all 10 tests pass, including 4 new ones for it. I haven't committed anything.

- **Login:** it takes `{email, password}`. A correct login returns 200 with `{token: 'secret'}`. That's the fixed token `/orders` already checks for, so it works there. A wrong password returns 401, and a missing or non-string email or password returns 400.
- **Lockout:** the third wrong password in a row for an email still returns 401. Every attempt after that returns 429, even with the right password. A successful login before the third failure resets the count. Counts are tracked per email.
- **Where:** the logic is in `src/login.js` and the route is in `src/router.js`.

Three behaviours you might not expect:
- The lock never expires, and the counts are in memory, so a restart clears them.
- Unknown emails are counted and locked the same way as real ones, so the 429 doesn't reveal which accounts exist.
- A locked account has no unlock path yet.

I didn't write a changelog, because your request was to add the endpoint. The git-weekly-changelog skill only summarises recent history. If you want a changelog of this week's commits, say so.