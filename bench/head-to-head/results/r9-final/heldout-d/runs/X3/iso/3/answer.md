I wrote `RELEASE_NOTES.md`. I based it on the actual code diff between v1.2.0 and v1.3.0, not on the commit messages, and the two disagree in places.

- **Timeout:** The commit says "increase default timeout to 60s", but `src/config.js` sets 45000 ms (up from 30000). The notes say 45 seconds.
- **README:** It says "Supports CSV export of reports". CSV export was added and then reverted inside this range, so v1.3.0 doesn't have it. The notes say it isn't included. You should fix the README line.
- **Renamed option:** The "tidy option names" commit renamed `maxItems` to `limit`. That breaks existing callers, because the old name is silently ignored. I put it first in the notes as the action customers need to take.
- **Retry:** `withRetry` is an exported helper. `fetchAll` doesn't use it, and it doesn't handle async functions. The notes say so, so customers don't expect automatic retries.

If the timeout is meant to be 60s, the code needs a fix and the notes need a one-word change.