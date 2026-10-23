`PR.md` is written in the repo root. I changed no code. The `git status` after the test run shows only `PR.md`, untracked.

**Test run, quoted as printed (re-run after my last edit to `PR.md`):**
```
ℹ tests 3
ℹ pass 2
ℹ fail 0
ℹ skipped 1
```
The skipped test is `throws the last error when attempts are exhausted`. The "Test result" section in `PR.md` matches this output.

**What `PR.md` contains:**
- A title, then the "For the customer" block first, then the technical detail. The block says the sync job now retries a failed fetch, up to 5 attempts 200 ms apart, instead of failing on the first error.
- A summary of the three changed files: `src/retry.js`, `src/sync.js` and `test/retry.test.js`. I read and traced `src/retry.js` and the one-line change in `src/sync.js`.
- The Claude Code attribution line at the end.

**Problems I found in the branch, written into `PR.md` for reviewers:**
- **Backoff:** the commit "Add retry helper with exponential backoff" is inaccurate. `retry` waits the same `delayMs` between every attempt.
- **Coverage:** the commit "Add full test coverage for retry" is inaccurate. The test for "all attempts fail, last error is thrown" is marked `test.skip`, so that path has no running test.
- **Retry scope:** every error is retried, including permanent ones. In the worst case that adds about 800 ms (4 waits of 200 ms) before the error appears. I worked that out from the constants and did not measure it.
- **Sync coverage:** no test runs a failing fetch through `runSync`. The only sync test uses a fetch that succeeds on the first call.

**Not checked:**
- I could not run `npx product-engineer check PR.md --kind pr`, because the package isn't installed and npx was cancelled. I put the block first by hand.
- No real failing fetch source was exercised.

Before you open the PR, you may want to fix the two commit messages or un-skip the exhaustion test, so the history matches the description.