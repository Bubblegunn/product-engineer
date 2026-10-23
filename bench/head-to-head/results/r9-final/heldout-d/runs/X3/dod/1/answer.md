I wrote `RELEASE_NOTES.md` in the repo root. I based it on the code diff between v1.2.0 and v1.3.0, not just the commit messages. I didn't run the test suite or `/dod:verify`, since this change is a doc only.

The notes cover three changes:
- **Breaking rename:** the `maxItems` option is now `limit`. The old name is silently ignored, so callers still passing it get the full list back. I put this at the top.
- **New retry helper:** `withRetry` retries a failing call, 2 times by default. It is synchronous, has no delay between attempts, and doesn't handle promises, so the notes say so.
- **Longer timeout:** the default timeout goes from 30s to 45s.

Two things to check:
- **Timeout mismatch:** the commit message says "increase default timeout to 60s", but the code sets 45000 ms. I wrote 45s because that's what ships. If you meant 60s, that's a bug in the release.
- **README claims CSV export:** the line "Supports CSV export of reports" is wrong, because the CSV feature was added and then reverted before this release. The release notes list CSV export as not included. I didn't change the README.