I wrote `RELEASE_NOTES.md` in the repo root, covering v1.2.0 to v1.3.0. I only read git history and the diff. I didn't run any tests or builds.

The notes cover:
- **Breaking rename:** the `maxItems` option is now `limit`. Code still passing `maxItems` silently falls back to the default of 100, so I put this first with a before/after example.
- **New `withRetry` helper:** it makes 2 retries by default.
- **Timeout:** the default goes from 30s to 45s.
- **README:** a README was added.
- **CSV export:** it was added and then reverted, so the notes list it as not included.

Two things in the repo don't match, and you may want to fix them:
1. **Timeout value:** the commit message says "increase default timeout to 60s", but `src/config.js` sets 45000 ms. I used 45s because that's what the code does. If 60s was the intent, that's a bug in v1.3.0.
2. **README:** it still says "Supports CSV export of reports", but that feature was reverted. Customers reading it would expect a feature that doesn't exist.