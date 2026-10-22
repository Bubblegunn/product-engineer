`PR.md` is written in the repo root. I changed no code.

I wrote it from the diff against `main` and a run of `npm test`. Three things in it may surprise reviewers:
- **Backoff:** The first commit says "exponential backoff", but the delay is fixed. It is 200 ms between attempts in `runSync`.
- **Tests:** The commit "Add full test coverage for retry" is inaccurate. `npm test` gives 2 pass and 1 skipped. The skipped test is the one for exhausted attempts (`test.skip`), and I did not run it with the skip removed. Nothing tests that `runSync` retries.
- **Behavior change:** `retry` retries every error type. It also calls `fetchFn` with the attempt index, where before it got no arguments.

The commit messages are still wrong. Fix them or squash if that matters to you. Remove the `test.skip` and add a `runSync` retry test if you want the "full coverage" claim to be true. Otherwise leave `PR.md` as is.