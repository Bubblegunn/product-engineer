I wrote `RELEASE_NOTES.md`, based on the actual diff between v1.2.0 and v1.3.0 rather than the commit messages. Three things differ from what the commits suggest:

- **Timeout:** One commit says the default timeout rose to 60s, but the code sets 45s (up from 30s). The notes say 45s.
- **CSV export:** It was added and then reverted, so it isn't in this release. The README still claims it, which is wrong. The notes say so, and you may want to fix the README.
- **`maxItems` rename:** `maxItems` became `limit`, and the old name has no fallback. Integrators who pass `maxItems` will silently get the default of 100. The commit called this a "tidy", but I put it at the top of the notes as a breaking change.

The notes also cover the new `withRetry` helper, which defaults to 2 retries.

I didn't commit the file.