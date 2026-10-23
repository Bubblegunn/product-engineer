I added `POST /login`, and all 12 tests pass, including 6 new ones for login. I haven't committed anything.

- **Success:** `{email, password}` with the right credentials returns 200 and `{token: 'secret'}`. That is the fixed value `/orders` already accepts through `x-token`, and a test confirms it.
- **Wrong password:** returns 401 and adds one to that email's failure count.
- **Lock:** after 3 wrong passwords in a row for an email, the next attempt gets 429, even with the right password. The lock is per email and ignores case.
- **Reset:** a successful login clears the count.
- **Bad input:** a missing or non-string field, or an email that fails the existing `isValidEmail`, returns 400.

The route is in `src/router.js`, the logic in the new `src/login.js`, and the tests in `test/login.test.js`.

- **No unlock:** the lock never expires, because you didn't specify a duration. The failure counts are in memory, so a restart clears them. Tell me if you want a timed lock or an unlock path.
- **Unknown emails count:** failures for emails that aren't registered are counted too. Locking only real accounts would reveal which emails exist.

I used the skill only for its read-only repo check. The last 7 days of history (2026-10-16 to 2026-10-23) have no commits, so I didn't write a changelog. I can generate one for a wider range if you want.