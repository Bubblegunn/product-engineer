I wrote `PR.md` in the repo root and changed no code. I ran `npm test` on the branch: 3 tests, 2 pass, 0 fail, 1 skipped. I read `test/sync.test.js` to confirm what it covers.

The commit messages overstate two things, so the PR description says so directly:

- **Backoff is not exponential.** `src/retry.js` waits the same `delayMs` between every attempt. The sync job uses 5 attempts at 200 ms, so a sync that always fails waits 800 ms in total. The first commit message says "exponential backoff", which is wrong.
- **Coverage is not full.** The exhaustion test (`throws the last error when attempts are exhausted`) is `test.skip`. The commit message "Add full test coverage for retry" is therefore inaccurate. I did not check why it was skipped or run it.

`PR.md` also lists these behaviours so reviewers can judge them:

- Every error is retried, including errors that can never succeed on retry.
- `fetchFn` now receives the attempt number as an argument.
- A `fetchFn` that is not safe to repeat can now run up to 5 times per sync.
- The `runSync` retry wiring has no test, because the sync test only uses a fetch that succeeds.

I ended `PR.md` with the "Generated with Claude Code" line from the attribution rule. I did not add the Turkish plain-language section from your `CLAUDE.md`, because that rule is for commit messages and I made no commit.