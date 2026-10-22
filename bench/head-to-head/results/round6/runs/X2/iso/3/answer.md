`PR.md` is in the repo root. I changed no code. I ran `npm test` and checked the diff against `main` before writing it.

The file has a title, a summary, a list of changes, a "behavior to be aware of" section, test status, and a "not done" list. Two commit messages on the branch say things the code doesn't do, so the file corrects them:

- **"Exponential backoff":** the delay is a fixed `delayMs` between attempts, with no growth or jitter. The PR says so.
- **"Full test coverage":** `npm test` gives 3 tests, 2 pass and 1 is skipped. The skipped one, `throws the last error when attempts are exhausted`, is the test for the exhaustion path. No test covers `runSync` retrying, because `test/sync.test.js` only checks the success case.

Other behavior changes to `runSync` that the file lists:

- Every error is retried, including permanent ones.
- A fetch that always fails now makes 5 calls and waits about 800 ms before throwing. Before, it failed after one call.
- `fetchFn` now receives the attempt number as an argument.

Before you open the PR, you could enable the skipped test and fix the two commit messages if you don't want reviewers to see the mismatch. I left both alone.