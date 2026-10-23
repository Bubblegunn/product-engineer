`POST /refund` now exists as a stub. It doesn't call a payment gateway yet, and all 9 tests pass. I haven't committed anything.

**Purpose:** The endpoint accepts a refund request for an order. It does not move any money yet.

**Behavior** ([router.js:L17-L23](file://<WORK>/runs/H3-iso-invoked-1/repo/src/router.js#L17-L23)):

| Request | Status | Body |
|---|---|---|
| No valid `x-token` header | 401 | `{ error: 'unauthorized' }` |
| Token valid, `orderId` missing | 400 | `{ error: 'orderId is required' }` |
| Token valid, `orderId` present | 202 | `{ orderId, refund: 'pending' }` |

**Implementation:**
```js
if (req.method === 'POST' && req.path === '/refund') {
  if (!requireAuth(req)) return { status: 401, body: { error: 'unauthorized' } };
  const orderId = (req.body || {}).orderId;
  if (!orderId) return { status: 400, body: { error: 'orderId is required' } };
  // The payment gateway is not connected yet, so the refund is only recorded as pending.
  return { status: 202, body: { orderId, refund: 'pending' } };
}
```

- **Gateway hook:** Replace the comment line with the gateway call when you wire it up.
- **Status 202:** I chose 202 (Accepted) because the refund is not complete. Switch to 200 or 201 once the gateway confirms it.
- **Tests:** Three new tests in [router.test.js](file://<WORK>/runs/H3-iso-invoked-1/repo/test/router.test.js) cover the three cases above.
- **Not checked yet:** The handler doesn't check that the order exists or has already been refunded.