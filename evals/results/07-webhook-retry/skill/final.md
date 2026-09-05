Committed to `retry-accounting-webhook` (branched off `main` rather than committing to it directly).

**What I changed** — `src/webhook.js:1`:
- Retries up to 4 times on network errors and 408/429/5xx, exponential backoff with full jitter (500ms base, 8s cap).
- 4xx rejections other than 408/429 fail on the first call — accounting will reject a malformed payout identically every time.
- `notifyAccounting` now returns `{ ok, status, error, attempts }`. Previously it swallowed every failure into a `console.error`, so callers couldn't tell a delivered payout from a dropped one — that's part of why these only surfaced at reconciliation.

**Verification is thinner than "done" should mean.** I wrote `src/webhook.test.js` (7 tests, all pass) covering retry-then-succeed, give-up, no-retry-on-4xx, and the backoff sequence. But I have not watched this run against the real accounting endpoint or in production logs — there are no callers of `notifyAccounting` in this repo, so I couldn't trace a real payout through it. Worth confirming the retry actually fires on the next real blip before telling finance the problem is fixed.

**Two things you should weigh, both recorded in the commit under `Not shipped:`**

1. **This does not fully solve the reported problem.** Retries cover a brief blip. If accounting is down longer than ~8 seconds, or the process restarts mid-retry, the payout is still lost with no record. If the finance assistant's missing payouts come from longer outages, they'll keep appearing — the fix for that is a queue with a dead-letter, which is storage, not a loop. I'd suggest checking what the actual failures looked like before assuming this closes it.

2. **Retries can double-deliver.** If accounting processed the payout but the response was lost, the retry sends it again — a payout showing up twice in reconciliation. Deduping needs an idempotency key that accounting agrees to honour, which is a change on their side too.

I also left out a request timeout: a hung connection blocks all retries, but adding an `AbortSignal` changes behaviour for callers passing their own `fetchImpl`, so I didn't slip it in unannounced.
