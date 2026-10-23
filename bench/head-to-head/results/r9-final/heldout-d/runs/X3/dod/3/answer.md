I wrote `RELEASE_NOTES.md`. I didn't run any tests or the DoD verify step, since this was a docs-only change.

I based the notes on the actual diff between v1.2.0 and v1.3.0, not just the commit messages. The notes cover:
- **Breaking change:** the `maxItems` option is renamed to `limit`. Code still passing `maxItems` silently gets the default of 100.
- **New:** an exported `withRetry(fn, retries)` helper, with 2 retries by default. `fetchAll` doesn't call it, and it only works with synchronous functions.
- **Changed:** the default timeout goes from 30s to 45s.
- **Not included:** CSV export was added and then reverted inside this range, so the notes say it isn't in v1.3.0.

I found three problems in the repo that you may want to fix:
1. **Timeout mismatch:** the commit message says the timeout went to 60s, but `src/config.js` sets 45000 ms. The notes say 45s, which is what the code does. If 60s was intended, that's a bug in the release.
2. **README is wrong:** it says "Supports CSV export of reports", but that feature was reverted. Customers will read this.
3. **Rename wasn't flagged as breaking:** the commit "tidy option names" reads as housekeeping, but it breaks existing callers.

I haven't changed the README or the config. I can fix them if you want, but v1.3.0 is already tagged, so a fix would need a v1.3.1.