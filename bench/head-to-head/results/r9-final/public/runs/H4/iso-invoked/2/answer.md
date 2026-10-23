`requireAuth` now lives in its own module, and all 6 tests pass. I didn't commit the change.

## System purpose

[`src/auth.js`](file://<WORK>/runs/H4-iso-invoked-2/repo/src/auth.js#L1-L6) holds the token check. [`src/router.js`](file://<WORK>/runs/H4-iso-invoked-2/repo/src/router.js#L1) imports it.

## Implementation detail

- **New module:** `src/auth.js` exports `requireAuth`. The function body and its comment are unchanged.
- **Router change:** `src/router.js` no longer defines `requireAuth`. It loads the function with this line:

```js
const { requireAuth } = require('./auth');
```

- **Behaviour:** `POST /orders` still returns 401 without the `x-token: secret` header.

## Next step

You can add tests for `requireAuth` in `test/auth.test.js`. Tell me if you want them.