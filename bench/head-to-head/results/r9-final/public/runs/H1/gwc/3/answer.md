I added `POST /login`, and all 12 tests pass, including 6 new ones for login. I haven't committed anything.

- **Login:** it takes `{email, password}` and returns `200 {token}` for a correct password and `401` for a wrong one. A body without a string email and password gets `400`.
- **Lock:** after 3 wrong passwords in a row for an email, every later attempt for it gets `429`, even with the right password.
  - A successful login resets the count.
  - The count is kept per email, so locking one account doesn't affect others.
  - Unknown emails are counted the same way, so the response doesn't reveal whether an account exists.
- **Token:** it's a random hex string, and `/orders` now accepts it in `x-token`. The old fixed `secret` token still works, so the existing tests are unchanged.
- **Code:** the login logic is in `src/auth.js`, the route is in `src/router.js`, and the tests are in `test/login.test.js`.

- **No unlock:** you didn't specify one, so a locked account stays locked until the process restarts. A timed lockout or an admin reset would be an easy addition.
- **In-memory state:** the failure counts and issued tokens are lost on restart and aren't shared between multiple instances.