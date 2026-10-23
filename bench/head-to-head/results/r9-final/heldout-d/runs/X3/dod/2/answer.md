I wrote `RELEASE_NOTES.md` from the actual code diff between v1.2.0 and v1.3.0, not from the commit messages. I didn't run the tests or any DoD checks, since this is a docs-only change.

The notes cover four points:
- **Breaking change:** the `maxItems` option is now `limit`. Code that still passes `maxItems` silently gets the default cap of 100.
- **New:** a `withRetry(fn, retries)` helper, with 2 retries by default.
- **Changed:** the default timeout is now 45 seconds, up from 30.
- **Not included:** CSV export, which was added and then reverted.

Two things in the repo don't match the commit history:
- **Timeout:** the commit "increase default timeout to 60s" actually set it to 45s in `src/config.js`. I wrote 45s because that's what the code does. If 60s was intended, that's a bug to fix before customers rely on it.
- **README:** it says "Supports CSV export of reports", but that feature was reverted. I left the README alone since you didn't ask me to change it, but it will mislead customers.

I haven't committed anything.