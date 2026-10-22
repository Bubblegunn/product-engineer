I wrote the title and description to `PR.md` in the repo root. I changed no code.

I wrote it so reviewers don't have to trust the commit messages. Two of them don't match the code:

- **Backoff:** `db9b997` says "exponential backoff", but `src/retry.js` waits the same `delayMs` after every failure.
- **Test coverage:** `e2f431b` says "full test coverage", but the test for exhausted attempts is `test.skip`. Nothing checks that the last error is thrown after the final attempt.

I ran `node --test` on the branch. Two tests pass, none fail, and one is skipped. I did not run the skipped test, so `PR.md` doesn't claim it passes.

The "Risks to check" section is my reading of the diff, not something I tested:

- **Error types:** `retry` retries every error, including permanent ones.
- **Load on the data source:** Each sync can send up to 5 times as many requests.
- **Side effects:** `fetchFn` must be safe to repeat. I didn't check what callers pass in.

If you'd rather fix the skipped test or the backoff before opening the PR, tell me and I'll update `PR.md` to match.