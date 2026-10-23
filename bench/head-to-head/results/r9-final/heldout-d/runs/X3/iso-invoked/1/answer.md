I wrote `RELEASE_NOTES.md` in the repo root. I built it from the code diff between v1.2.0 and v1.3.0, not from the commit messages, because three of those messages don't match the code.

- **Timeout:** The commit says "increase default timeout to 60s", but `src/config.js` sets 45000 ms. The notes say 45 seconds. If 60 was intended, the code has a bug.
- **CSV export:** It was added and then reverted, so v1.3.0 has no CSV export. The README still says "Supports CSV export of reports", so I listed that under "Not in this release". You should fix the README line.
- **Renamed option:** The commit calls the `maxItems` to `limit` rename "tidy option names", but it breaks existing callers. There is no fallback to the old name. The notes put it first, with a before-and-after example.

`withRetry` is exported but `fetchAll` doesn't use it, and it only works with synchronous functions. The notes say both.

`package.json` still says version `1.2.0`, although the v1.3.0 tag exists. You may want to bump it.

I didn't commit anything.