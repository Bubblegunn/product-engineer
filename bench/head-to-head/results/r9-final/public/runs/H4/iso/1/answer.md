I moved the auth check into its own module, `src/auth.js`, and the 6 existing tests still pass. I didn't commit anything.

The check was the `requireAuth` function in `src/router.js`. `src/auth.js` now exports it unchanged, and `router.js` imports it from there. I added no new tests, since the function's behavior didn't change.

It's a plain function that returns true or false, not Express-style `(req, res, next)` middleware, so I kept it that way. I can convert it if you want.