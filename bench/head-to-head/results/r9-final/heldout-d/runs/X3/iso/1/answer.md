I wrote `RELEASE_NOTES.md` from the code that changed between v1.2.0 and v1.3.0. I haven't committed it.

The notes cover:
- **Breaking change:** the `maxItems` option is now `limit`. The old name is silently ignored, and the notes include a before/after example. The commit that did this was labelled "tidy option names", but it will break existing integrations.
- **New:** a `withRetry` helper, which retries up to 2 times by default.
- **Changed:** the default timeout goes from 30s to 45s.

Two things don't match the git history:
- **Timeout:** the commit message says 60s, but the code sets 45000 ms. I wrote 45s because that's what the code does. If 60s was the intent, that's a bug to fix before customers rely on it.
- **CSV export:** it was added and then reverted, so it isn't in this release. The README still says "Supports CSV export of reports", and the notes call that line wrong. You may want to fix the README.