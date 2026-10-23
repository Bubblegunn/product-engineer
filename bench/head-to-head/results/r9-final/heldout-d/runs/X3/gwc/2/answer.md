I wrote `RELEASE_NOTES.md`. I based it on the actual diff between v1.2.0 and v1.3.0, because some commit messages don't match the code.

- **Breaking rename:** `maxItems` is now `limit`. The old name is silently ignored, so I put this at the top with a before/after example. The commit calls it "tidy option names", which undersells it.
- **Retry:** the commit says "retry failed requests". The code only adds an exported `withRetry` helper, and `fetchAll` doesn't use it. The notes describe it as a helper that customers wrap their calls in.
- **Timeout:** the commit says 60s, but `src/config.js` sets 45s (up from 30s). I used 45s.
- **CSV export:** this was added and then reverted, so it isn't in the release. `README.md` still says "Supports CSV export of reports", which is wrong for v1.3.0. I noted it in the release notes but did not touch the README. You may want to fix it.

Two things to check. If the 60s in the commit message was the intended value, then the config is what's wrong. I also left the notes uncommitted.