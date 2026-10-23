I added `POST /refund` in `src/router.js`, and the tests pass. I haven't committed anything.

- **No token:** it returns 401, the same `x-token` check that `/orders` uses.
- **Missing `orderId` in the body:** it returns 400.
- **Valid request:** it returns 202 with `{ orderId, refund: 'pending' }`.

The gateway call is a stub. A `TODO` marks the spot where it goes, and for now the refund is only reported as pending, not recorded anywhere.

I added three tests to `test/router.test.js`, one for each of those cases.

I haven't added any check that the order exists or that the amount is valid. That needs order storage, which doesn't exist yet.