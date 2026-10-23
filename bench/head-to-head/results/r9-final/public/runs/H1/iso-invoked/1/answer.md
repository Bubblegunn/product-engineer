`POST /login` now works, and all 12 tests pass (6 of them new). I haven't committed anything.

## Purpose
`/login` takes `{email, password}` and returns `{token}`. After 3 wrong passwords in a row for one email, that account is locked and every later attempt gets 429.

## How a login attempt is handled
| Condition | Status | Effect |
|---|---|---|
| `email` or `password` is missing, not a string, or the email is invalid | 400 | No count change |
| Email already has 3 failures in a row | 429 | Even the right password is refused |
| Wrong password or unknown email | 401 | Failure count for that email goes up by 1 |
| Right password | 200 | Failure count resets and the token is returned |

The table shows the order of the checks. The lock check runs before the password check, which is why the right password still gets 429.

## Implementation
- **Login logic:** [`src/login.js:L12-L28`](file://<WORK>/runs/H1-iso-invoked-1/repo/src/login.js#L12-L28) holds the `login` function and the failure counter.
- **Route:** [`src/router.js:L9-L11`](file://<WORK>/runs/H1-iso-invoked-1/repo/src/router.js#L9-L11) sends `POST /login` to `login`.
- **Tests:** [`test/login.test.js`](file://<WORK>/runs/H1-iso-invoked-1/repo/test/login.test.js) covers the token, 401, 400, the lock, the reset after a success, and that locks are per email.

## Choices to check
- **Token:** it is the fixed value `secret`, because `requireAuth` in the router only accepts that value. Replace it if you add real tokens.
- **Lock duration:** you didn't specify one, so a lock lasts until the process restarts. The counts live in memory.
- **Unknown emails:** they count toward the lock too, so a 429 doesn't reveal whether an account exists.
- **Case:** emails are matched without regard to case for the lock count.

If you want the lock to expire after a set time, tell me the duration and I'll add it.