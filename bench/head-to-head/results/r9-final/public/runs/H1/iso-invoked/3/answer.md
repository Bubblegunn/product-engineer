`POST /login` now exists and locks an account after 3 wrong passwords in a row. All 11 tests pass, including 5 new ones in `test/login.test.js`. I haven't committed anything.

## What it does

`POST /login` takes `{email, password}` JSON. The logic is in [`src/login.js`](file://<WORK>/runs/H1-iso-invoked-3/repo/src/login.js#L1-L29), and [`src/router.js`](file://<WORK>/runs/H1-iso-invoked-3/repo/src/router.js#L9-L11) routes to it.

| Situation | Status | Body |
|---|---|---|
| `email` or `password` missing or not a string | 400 | `{error}` |
| Account already has 3 wrong passwords in a row | 429 | `{error: 'account locked'}` |
| Wrong password (streak below 3) | 401 | `{error}` |
| Right password | 200 | `{token: 'secret'}` |

- **Lock check order:** The lock check runs before the password check. The 4th attempt gets 429 even with the right password.
- **Streak reset:** A successful login resets that email's streak to zero.
- **Token value:** The token is the fixed value `secret`, because `requireAuth` in `router.js` only accepts that value. A test confirms the login token works on `POST /orders`.

## Limits to know about

- **No unlock:** A locked account stays locked until the process restarts. You didn't ask for an unlock, so I added none.
- **In-memory state:** Failure counts live in memory. They reset on restart and aren't shared between server instances.
- **Unknown emails:** Unknown emails get the same count and lock. A 429 therefore doesn't reveal which accounts exist.
- **Lockout abuse:** Anyone can lock a known user's account by sending 3 bad passwords. That follows from the rule you specified.