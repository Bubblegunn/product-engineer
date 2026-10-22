`PR.md` is written in the repo root. I didn't change any code. I read the full diff against `main` and ran `npm test` before writing it.

The description is written to match the code, not the commit messages. Reviewers will find these points in it:

- **Delay is constant, not exponential.** The commit "Add retry helper with exponential backoff" is inaccurate. The code waits a fixed `delayMs` between attempts. With the `runSync` settings, a fully failing fetch makes 5 calls and waits about 0.8 s in total.
- **One test is skipped.** The `throws the last error when attempts are exhausted` test is marked `test.skip`. So the commit "Add full test coverage for retry" is also inaccurate, and the exhausted-attempts path has no running test.
- **Test result.** `npm test` gives 3 tests: 2 pass, 0 fail, 1 skipped.
- **`runSync` retry untested.** No test covers `runSync` retrying after a failure.
- **Behavior changes.** Every error is retried, including non-transient ones. `fetchFn` is now called with the attempt index.

I put these in a "Behavior to know before approving" section and an "Open items" list. Decide whether to fix the commit messages, enable the skipped test, or implement exponential backoff before you open the PR. I didn't touch the commits.