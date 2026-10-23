I moved `requireAuth` into a new `src/auth.js`, and `src/router.js` now imports it from there. The behavior is unchanged, and all 6 tests pass.

The auth check is a plain function, not Express-style middleware. The router still calls it inline on `POST /orders`. I didn't commit anything.