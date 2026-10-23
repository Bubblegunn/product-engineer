I wrote `RELEASE_NOTES.md` in the repo root. It covers v1.2.0 to v1.3.0 in plain language, with no commit hashes. I only read the git history and the diff; I didn't run the tests.

- **Breaking rename:** `maxItems` is now `limit`. The old name is silently ignored, so integrators who still pass it get the default of 100. I put this at the top with a before/after example.
- **New:** a `withRetry` helper and a `retries` setting, defaulting to 2 retries (3 attempts in total).
- **Changed:** the default timeout is now 45 seconds, up from 30.
- **Not included:** CSV export was added and then reverted, so it isn't in this release. The notes say so.

Two things in the repo don't match its history:
- **Timeout:** the commit message says the default went to 60s, but the code sets 45000 ms. I wrote 45 seconds because that's what the code does. If 60s was the intent, that's a bug to fix before shipping.
- **README:** it still says "Supports CSV export of reports," which is wrong after the revert. The notes mention it, but I didn't edit the README.