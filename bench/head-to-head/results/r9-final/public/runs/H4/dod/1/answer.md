I moved `requireAuth` out of `src/router.js` into a new `src/auth.js`. The router now imports it from there. All 9 tests pass with `npm test`, including 3 new ones.

- **Behavior:** unchanged. `POST /orders` still returns 401 without the right `x-token` header and 201 with it.
- **Docstring:** I added a JSDoc comment to `requireAuth`, since `DOD.md` asks for one on public functions.
- **Tests:** the new `test/auth.test.js` covers a correct token, a wrong token, and a request with no headers.
- **Hardcoded token:** the token is still the literal `'secret'`. I moved it as-is, but `DOD.md` says configuration belongs in config files. I can switch it to read from an environment variable if you want.
- **Not run:** I didn't run `/dod:verify`.