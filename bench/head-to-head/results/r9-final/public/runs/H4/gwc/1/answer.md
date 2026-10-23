I moved the auth check into a new module, `src/auth.js`, and `src/router.js` now imports it. The six tests pass. I didn't commit anything.

The check was a single function, `requireAuth`, which compares the `x-token` header to a fixed value. It isn't middleware in the Express sense, and I left its behavior and signature as they were.