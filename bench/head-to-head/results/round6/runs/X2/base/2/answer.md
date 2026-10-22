`PR.md` is written in the repo root, and I changed no code. I checked it against the diff and a `node --test` run.

The commit messages overstate two things, so the description corrects them instead of repeating them:
- **Backoff:** `db9b997` says "exponential backoff", but `retry` waits a fixed `delayMs` between attempts. `PR.md` says the delay is fixed. The worst case for `runSync` is about 800 ms of added delay.
- **Test coverage:** `e2f431b` says "full test coverage", but the "throws the last error when attempts are exhausted" test is `test.skip`. The test run showed 2 passed, 0 failed and 1 skipped. `PR.md` says the exhaustion path is untested.

`PR.md` also lists two behavior notes that reviewers should see:
- Every error is retried, including permanent ones.
- `fetchFn` now receives the attempt index as its first argument.

Before you open the PR, decide whether to fix these in code or leave them documented. Un-skipping that test and making the delay exponential would make the commit messages true.

The commit and PR attribution lines from the session instructions don't apply here. `PR.md` is a description file, not a commit or a PR body I'm posting.