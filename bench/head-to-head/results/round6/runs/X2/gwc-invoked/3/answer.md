`PR.md` is written in the repo root. I changed no code and ran no tests; I only read git history and the changed files.

Two commit messages don't match the code, and I put both in the file so reviewers aren't misled:
- **Backoff:** the commit says "exponential backoff", but the delay is constant (`delayMs` between every attempt).
- **Test coverage:** the commit says "full test coverage", but the "throws the last error when attempts are exhausted" test is marked `test.skip`. Only the success-after-failures test runs, and `runSync` has no tests.

The file also notes that every error is retried, including permanent ones, and that `fetchFn` now receives the attempt index as an argument. The sync job now makes up to 5 attempts, 200 ms apart.

The title is "Add retry helper and use it in the sync job". The 3 commits change 3 files (+35/−1). You may want to un-skip that test or fix the commit wording before opening the PR.