I moved the auth check out of `src/router.js` into its own module, `src/auth.js`. All 9 tests pass with `npm test`, including the existing router tests that exercise `POST /orders`.

- **No middleware:** The auth code was a single function, `requireAuth(req)`, called inline in the `POST /orders` route. There was no middleware layer, so I extracted that function.
- **Router:** `src/router.js` now imports `requireAuth` from `./auth`, and its behavior is unchanged.
- **Docs and tests:** I added a JSDoc comment to `requireAuth` and a new `test/auth.test.js`. It covers a correct token, a wrong token and a missing `headers` object.
- **Hardcoded token:** The token is still hardcoded as `'secret'`. I kept that as-is because this was a pure move, but your `DOD.md` says config should live outside source. Do you want me to read it from an env var?
- **Not run:** I didn't run `/dod:verify` or commit anything.