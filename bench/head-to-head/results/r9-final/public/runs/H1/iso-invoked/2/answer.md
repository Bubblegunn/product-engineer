`POST /login` now exists, and all 10 tests pass. I didn't commit the change.

## What it does

`POST /login` takes `{email, password}` and returns a token. The logic is in [`src/login.js`](file://<WORK>/runs/H1-iso-invoked-2/repo/src/login.js), and the route is wired in [`src/router.js`](file://<WORK>/runs/H1-iso-invoked-2/repo/src/router.js).

| Case | Status |
|---|---|
| Email or password missing, or not a string | 400 |
| Wrong password, fewer than 3 in a row | 401 |
| Right password, account not locked | 200 with `{token}` |
| Account locked | 429, even with the right password |

## Behavior to know about

- **Lockout:** The third wrong password in a row locks the email. The 429 starts on the next attempt, and it applies to any email, including ones that don't exist.
- **Reset:** A successful login resets the count.
- **Permanent lock:** The lock has no expiry, and a server restart clears it. You didn't specify a duration, so tell me if you want a timed unlock.
- **In-memory state:** The failure counts and issued tokens live in memory. They are lost on restart and not shared between server instances.
- **Token use:** I changed `requireAuth` so `/orders` also accepts tokens from `/login`. The fixed `secret` token still works. Without this change, the returned token would have been useless.
- **Tests:** The new tests are in [`test/login.test.js`](file://<WORK>/runs/H1-iso-invoked-2/repo/test/login.test.js).