I wrote `RELEASE_NOTES.md`. I based it on the code diff between v1.2.0 and v1.3.0, not on the commit messages. Two things in the history didn't match the code:

- **Timeout:** the commit message says "increase default timeout to 60s", but the code sets 45s. The notes say 45s (up from 30s). If 60s was the intent, that's a bug to fix in a later release.
- **CSV export:** it was added and then reverted, so it isn't in this release. The README still says "Supports CSV export of reports", which is wrong. I left the README alone, but you should probably fix it. The notes include a line saying CSV export isn't available.

I put the `maxItems` → `limit` rename at the top as a breaking change. There's no alias for the old name, so existing callers will silently fall back to the default of 100. If you'd rather keep `maxItems` working, that needs a code change before you ship.

The notes also cover the new `withRetry` helper (2 retries by default).