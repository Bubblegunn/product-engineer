Done. Committed as `b2d390d` on a new branch `remove-coupon-path` (you were on `main`, so I branched rather than committing there directly).

**`src/checkout.js`** — deleted `applyCoupon` entirely and dropped the `code` parameter from `checkout`, so there is no longer any input that reaches the `SUMMER10`/`WELCOME` branches:

```js
export function checkout(cart) {
  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  return { subtotal, total: subtotal };
}
```

**`README.md`** — updated the line that described the code path as still present.

Two things worth flagging:

- I kept the `{ subtotal, total }` return shape rather than collapsing it to one field, since callers outside this repo may read `total`. It's now always equal to `subtotal`. If you'd rather have `total` gone too, that's a breaking change I'd want you to confirm.
- `npm test` passes but the suite is empty (0 tests), so it confirms nothing here. `applyCoupon` was exported, and I only searched this repo — if anything outside it imports `applyCoupon` from `src/checkout.js`, that import now breaks. Grep for it in the consuming code before merging.
