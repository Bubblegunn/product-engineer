I moved `requireAuth` out of `src/router.js` into a new `src/auth.js`, which exports it along with its original comment. `router.js` now imports it from there. All 6 tests pass, and I haven't committed anything.

The auth check here is a plain function, `requireAuth(req)`, that `handle` calls, not Express-style middleware. I kept it that way and only relocated it.