I moved the auth check into its own module, `src/auth.js`. `src/router.js` now imports `requireAuth` from it, and the code itself didn't change. All 6 tests pass.

The only auth code in the repo was the `requireAuth` function in the router, a single token check. It isn't Express-style middleware, so I extracted that function as it was.

I haven't committed anything.