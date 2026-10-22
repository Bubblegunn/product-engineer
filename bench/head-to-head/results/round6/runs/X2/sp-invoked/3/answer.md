I wrote the title and description to `PR.md` in the repo root. I didn't change any code. `PR.md` is the only new file (`git status` shows only it).

`npm test` on the branch gives 3 tests: 2 pass, 0 fail, 1 skipped. I ran the skipped test in a temporary copy of the repo, and it passes there. I also read `test/sync.test.js` to check what it covers.

The description tells reviewers four things that the commit messages hide:
- **Delay is fixed, not exponential:** The first commit message says "exponential backoff", but `retry` waits the same `delayMs` between every attempt.
- **One test is skipped:** The commit "Add full test coverage for retry" is inaccurate, because the test for exhausted attempts is marked `test.skip`.
- **Every error is retried:** `retry` doesn't separate transient errors from permanent ones.
- **No test for retry in `runSync`:** The only sync test covers the success path.

If you'd rather fix the delay or the skipped test before opening the PR, tell me and I'll change the code and update `PR.md` to match.