`POST /login` now exists, and all 13 tests pass, including 7 new ones for login. I haven't committed anything.

- **Request:** it takes `{email, password}`. A missing field or an invalid email gets 400.
- **Success:** a right password returns 200 with `{token}`. The token is the fixed `'secret'` that `/orders` already checks, so it works there.
- **Failure:** a wrong password gets 401. After the third wrong password in a row, the account is locked and every later attempt for that email gets 429, even with the right password.
- **Reset:** a successful login clears the failure count.

I made a few choices you didn't specify:
- **Email case:** emails are lowercased, so `ANA@…` can't dodge the lock.
- **Unknown emails:** these are counted and locked too, so a 429 doesn't reveal which accounts exist. The cost is that the failure map grows with every distinct email tried.
- **Unlocking:** a lock lasts until the process restarts or `resetLogins()` is called; there's no timed unlock. A timed unlock is easy to add if you want one.

The logic is in `src/login.js`, with the route added in `src/router.js` and tests in `test/login.test.js`.