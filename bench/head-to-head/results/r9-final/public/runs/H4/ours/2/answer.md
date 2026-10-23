I moved the auth check into its own module, `src/auth.js`, and `src/router.js` now imports it. The code is unchanged, and all 6 tests pass.

`requireAuth` was the only auth code in the repo. It still checks that the `x-token` header equals `secret`. I haven't committed anything.