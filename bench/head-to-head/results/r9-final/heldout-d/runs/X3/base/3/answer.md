I wrote `RELEASE_NOTES.md` for v1.3.0. I based it on the actual code diff between v1.2.0 and v1.3.0, not just the commit messages. It has three parts:

- **Breaking change:** the `maxItems` option is now `limit`. The old name is silently ignored and the default of 100 applies, so I put this first with a before/after example.
- **New:** a `withRetry(fn, retries)` helper that defaults to 2 retries. It isn't wired into `fetchAll`, so customers have to wrap their calls themselves.
- **Changed:** the default timeout is now 45 seconds, up from 30.

Two things in the history didn't match the code:
- **Timeout:** the commit message says "increase default timeout to 60s", but the code sets 45000 ms. The notes say 45 seconds. If 60 was the intent, that's a code bug to fix.
- **CSV export:** it was added and then reverted, but the README still says fetchkit supports it. I noted that CSV export isn't in this release. You'll probably want to fix the README line.

I didn't commit anything.