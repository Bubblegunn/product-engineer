`PR.md` is written in the repo root. I didn't change any code, and I didn't commit anything.

I checked the claims against the diff and the code, and the file says three things reviewers might not expect:

- **Skipped test:** The commit "Add full test coverage for retry" is inaccurate. The test `throws the last error when attempts are exhausted` is `test.skip`. `npm test` gives 2 pass and 1 skipped.
  - I ran that scenario by hand. `retry` rejects with the last error, and `runSync` makes 5 calls and then rejects.
  - No test covers the retry wiring in `runSync`.
- **Backoff:** The first commit message says "exponential backoff", but `retry` waits the same `delayMs` between attempts. `PR.md` doesn't claim exponential backoff and tells reviewers to decide which one should change.
- **Retry behavior:** `retry` retries every error, with no filter. An always-failing `fetchFn` now takes about 800 ms and 5 calls before `runSync` rejects.

Decision for you: the skipped test passes when run by hand, so you could unskip it before opening the PR. If you do, change the Testing section of `PR.md` to match.