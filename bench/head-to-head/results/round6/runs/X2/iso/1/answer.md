`PR.md` is written in the repo root. I didn't change any code. I wrote it from the diff against `main` and from a `node --test` run, not from the commit messages. Two commit messages are wrong, and the file says so.

- **Backoff:** The commit "Add retry helper with exponential backoff" is inaccurate. `src/retry.js` sleeps a fixed `delayMs` between attempts. In `runSync`, a fetch that keeps failing makes 5 calls with 4 waits of 200 ms, so about 800 ms before the error is thrown.
- **Test coverage:** The commit "Add full test coverage for retry" is inaccurate. The test "throws the last error when attempts are exhausted" is marked `test.skip`. The test run shows 3 tests, 2 pass and 1 is skipped. Nothing currently tests the path that throws the last error.
- **Other behavior:** `retry` retries every error, with no filter. It also calls `fn(i)`, so `fetchFn` now receives the attempt number, where `runSync` used to call it with no arguments.

The file ends with two open items for you: unskip the exhaustion test or accept the gap, and add real exponential backoff or describe it as fixed-delay. I did not edit the commit messages.

The PR description is in English. The attribution line from your Claude Code setup is for pull request descriptions you ask me to create, so I left it out of this file.