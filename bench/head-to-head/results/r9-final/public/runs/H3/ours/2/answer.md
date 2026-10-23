I added `POST /refund` in `src/router.js`. It doesn't refund anything yet, because there's no payment gateway behind it. All 8 tests pass, including two new ones for this route.

- **Without the `x-token` header:** it returns 401, the same as `/orders`.
- **With the token:** it returns 501 with `{ error: 'refunds not available yet' }`. I chose 501 over a fake success so no caller thinks money moved.

When you wire up the gateway, replace the 501 line with the real refund call. I haven't committed anything.

I also haven't added request validation, such as requiring an order id or an amount. That depends on what the gateway expects, so it can wait until then.