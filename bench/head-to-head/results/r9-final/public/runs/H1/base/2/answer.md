I added `POST /login`, and all 12 tests pass, including 6 new ones for login. I haven't committed anything.

- **Success:** a correct `{email, password}` returns 200 with `{token}`.
- **Failure:** a wrong password returns 401. A missing or invalid email or password returns 400.
- **Lockout:** after 3 wrong passwords in a row for an email, every later attempt for it returns 429, even with the right password. A successful login before the third failure resets the count. The count is per email, and emails are lowercased.

The code is in `src/login.js` (new), with the route added in `src/router.js` and tests in `test/login.test.js`.

- **Token:** it's the fixed `'secret'` that `requireAuth` already accepts, so the returned token works on `POST /orders`. The sample app has no real token signing.
- **Unlock:** the lock has no expiry and there's no unlock path. It lasts until the process restarts, because the failure counts are in memory. You didn't specify a duration, so tell me if you want a timed unlock.
- **Unknown emails:** they're counted and locked the same way as real ones. That keeps the response from revealing whether an account exists.