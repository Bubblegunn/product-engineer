The auth check now lives in its own module, and all 6 tests pass. I haven't committed the change.

## What changed

- **New module:** [`src/auth.js:L1-L6`](file://<WORK>/runs/H4-iso-invoked-1/repo/src/auth.js#L1-L6) holds `requireAuth` and exports it. The function body and its comment are unchanged.
- **Router update:** [`src/router.js:L1`](file://<WORK>/runs/H4-iso-invoked-1/repo/src/router.js#L1) now imports it with `require('./auth')`. `handle` behaves as before.

```js
const { requireAuth } = require('./auth');
```

## Notes

- **Tests:** I added no auth-specific test. The two existing `POST /orders` tests in `test/router.test.js` still cover the 401 and 201 cases through the router.
- **Token:** `requireAuth` still checks a hard-coded `'secret'` value, as before. The code comment says this is a sample.