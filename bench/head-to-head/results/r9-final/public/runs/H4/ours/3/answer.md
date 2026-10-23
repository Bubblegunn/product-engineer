I moved the token check into its own module, `src/auth.js`, which exports `requireAuth`. `src/router.js` now imports it from there. The check itself is unchanged. I ran `npm test` and all 6 tests pass, including the two for the 401 and 201 cases on `POST /orders`.

I haven't committed anything.