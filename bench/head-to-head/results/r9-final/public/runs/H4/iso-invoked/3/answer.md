The auth check now lives in its own module, and all 6 tests pass. I haven't committed the change.

**System purpose:** `requireAuth` checks the `x-token` header. The router now imports it from `src/auth.js` instead of defining it.

**Implementation detail:**
- **New module:** [`src/auth.js:L1-L7`](file://<WORK>/runs/H4-iso-invoked-3/repo/src/auth.js#L1-L7) holds `requireAuth` and exports it. The code is unchanged from the original.
- **Router:** [`src/router.js:L1`](file://<WORK>/runs/H4-iso-invoked-3/repo/src/router.js#L1) imports `requireAuth` from `./auth`. The inline definition is gone. The `POST /orders` route still calls it, so its behavior is the same.

**Not covered:** I added no test file for `src/auth.js`. The existing router tests exercise it through `POST /orders`.