Done — committed on branch `retry-accounting-webhook`.

**`src/webhook.js`** — up to 4 attempts with exponential backoff plus jitter (~250ms, 500ms, 1s). Retries on network errors, 429, and 5xx; fails fast on other 4xx since a retry can't help those.

**`src/webhook.test.js`** — new, 5 tests covering each path. All pass.

Two things I changed beyond the literal ask, because retries alone wouldn't have fixed the reported problem:

- **Added an `idempotency-key` header** set to `payout.id`. Retrying a POST is only safe if the receiver can dedupe — the common failure is the request landing and the *response* getting lost, so a naive retry double-posts the payout. **This needs verification on the accounting side:** if that endpoint ignores the header, retries will create duplicate entries, which is a worse problem for finance than the missing ones. Worth confirming before this ships.
- **It now throws after exhausting attempts** instead of only calling `console.error`. Silent swallowing is arguably the actual reason these went unnoticed until the finance assistant caught them. No callers exist in this repo, so nothing here breaks — but if `notifyAccounting` is called from another service, that caller now needs a catch or the payout flow will fail loudly instead of quietly.

I picked 4 attempts and the backoff constants without a reference point — if there's an SLA or retry convention elsewhere in your stack, they're single constants at the top of the file.
