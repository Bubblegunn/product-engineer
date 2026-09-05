Committed as `6e1af0e` on branch `remove-coupon-path`.

**What changed** — `src/checkout.js` now has one function:

```js
export function checkout(cart) {
  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  return { subtotal, total: subtotal };
}
```

`applyCoupon` is deleted along with the `code` parameter. I kept the `{ subtotal, total }` return shape so anything reading `total` keeps working — it just always equals the subtotal now. README updated to match.

**What I observed** — I ran the module rather than only reading it. On a 100 cart, `checkout` returns `total: 100` with no argument and with both `"SUMMER10"` and `"WELCOME"` passed as a stale second argument; those two previously returned 90 and 95. Importing `applyCoupon` now fails at module load, which is the "nobody can trigger it" part — the path isn't just unused, it's unreachable.

Two things worth flagging:

- **Callers outside this repo.** I grepped this repo and the only caller of `applyCoupon` was `checkout` itself, so nothing here breaks. But `checkout` is an exported function, and I can't see consumers in other repos. A caller still passing `checkout(cart, code)` won't error — the extra argument is silently ignored, which is the behavior you want — but it's worth a grep on your side if any service imports this.
- **No tests.** `package.json` defines `node --test`, but there are no test files, so there was nothing to run and nothing pinning this behavior. I didn't add a suite — that's wider than what you asked for — and recorded it under `Not shipped:` in the commit body with the reason.

I committed to a branch rather than `main`. Say the word if you'd like it on `main` directly or want a PR opened.
