I moved the auth check into its own module, `src/auth.js`. It exports `requireAuth`, with the same code and comment as before. `src/router.js` now imports it. The 6 existing tests pass. I haven't committed anything.

The repo has no middleware layer. The auth check was a single `requireAuth(req)` function that the `POST /orders` route calls directly, so I extracted that function.