`PR.md` is written in the repo root. I changed no code and ran no tests. I only read git history and the diff.

The PR title is "Add retry helper and use it in the sync job". The date range is `main..feature/retry`, not the skill's default last 7 days. The three commits are from 2026-09-03 to 09-05, so a 7-day window would have been empty.

Some commit messages don't match the code. `PR.md` says so, so reviewers aren't misled:
- **Backoff:** the commit says "exponential backoff", but the delay is a fixed `delayMs`. There is no backoff or jitter. Fix the code or the title.
- **Test coverage:** the commit says "full test coverage", but the "throws the last error when attempts are exhausted" test is `test.skip`. Nothing tests the failure path, and nothing tests the `runSync` change.
- **Retry behaviour:** every error is retried 5 times, and `fetchFn` now receives the attempt index as an argument. Worst case adds about 800 ms before the error reaches the caller.

Decide whether to fix the backoff and the skipped test before you open the PR. If you do, I'll update `PR.md` to match.