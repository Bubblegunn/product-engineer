I moved the token check into a new module, `src/auth.js`, which exports `requireAuth`. `src/router.js` now imports it from there. The logic hasn't changed, and all 6 tests pass.

I haven't committed anything.