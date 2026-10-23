I moved the auth check into `src/auth.js`, and all 6 tests pass.

The check was a function called `requireAuth` in `src/router.js`. It now lives in `src/auth.js` with its comment, and the router imports it. The behavior is the same.

I haven't committed anything.