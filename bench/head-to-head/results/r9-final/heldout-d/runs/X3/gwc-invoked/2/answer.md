I wrote `RELEASE_NOTES.md` for v1.3.0, covering v1.2.0 to v1.3.0 (six commits). I used that range instead of the skill's default 7-day window, and I only read git history without running tests or builds.

The notes cover:
- **Breaking rename:** `maxItems` is now `limit`. The old name has no alias and is silently ignored, so callers fall back to the default of 100. I put this first as "Action required".
- **New `withRetry(fn, retries)` helper:** it defaults to 2 retries and retries immediately with no delay. `fetchAll` doesn't use it, so callers have to wrap their own calls.
- **Longer default timeout:** it went from 30s to 45s.
- **CSV export:** it was added and then reverted, so it isn't in this release.

Two things need your attention:
- **Timeout mismatch:** the commit message says "increase default timeout to 60s", but `src/config.js` at v1.3.0 has 45000 ms. I wrote 45 seconds because that's what the code does. Check which one you meant.
- **Stale README:** the README still says "Supports CSV export of reports", which is wrong after the revert. I noted this in the release notes but didn't change the README.

I also left out the skill's usual emoji-section changelog format, because customer-facing notes read better in plain language.