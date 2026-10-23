I added `POST /refund` in `src/router.js`, and all 9 tests pass, including 3 new ones for this route. I haven't committed anything.

- **Auth:** it uses the same `x-token` check as `/orders`. Without the token it returns 401.
- **Validation:** a missing `orderId` in the body returns 400.
- **Success:** it returns 202 with `{ orderId, refund: 'pending' }`. It doesn't move any money yet. A `TODO` comment marks where the payment gateway call goes.

I picked 202 because the refund will probably be asynchronous once the gateway is connected. Say so if you'd rather have a different status or response shape.