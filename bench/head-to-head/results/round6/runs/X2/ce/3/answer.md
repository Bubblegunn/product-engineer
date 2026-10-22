`PR.md` is written in the repo root. I didn't change any code, and I didn't commit `PR.md`.

I wrote the description from the actual diff and a test run, not from the commit messages, because two of those messages are wrong:

- **"Exponential backoff" is inaccurate.** The code waits a constant `delayMs` between attempts. The PR says so.
- **"Full test coverage" is inaccurate.** The test for "throws the last error when attempts are exhausted" is `test.skip`. `npm test` shows 2 passed, 0 failed, 1 skipped. I ran that scenario by hand and `retry` does reject with the last error after the right number of calls, so the code works but CI doesn't cover it.

The description also tells reviewers that:

- `runSync` now makes up to 5 attempts with 200 ms between them.
- Every error is retried, including permanent ones.
- No test covers retry through `runSync`.

You may want to un-skip the test, or fix the "exponential" and "full coverage" wording in the commit messages, before opening the PR. I left both as they are.