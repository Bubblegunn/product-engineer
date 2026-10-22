`PR.md` is written in the repo root. The title is the first line: "Retry failed fetches in the sync job". I changed no code, and `PR.md` is the only new file. I ran the test suite and did not open the PR.

The file tells reviewers four things they might otherwise miss:

- **Skipped test:** The commit "Add full test coverage for retry" overstates what is tested. `npm test` gives 2 passed and 1 skipped. The skipped test is `throws the last error when attempts are exhausted`, marked `test.skip` in `test/retry.test.js`. I ran it unskipped in a temp copy outside the repo, and it passes. You can remove the skip before opening the PR.
- **No exponential backoff:** The first commit message says "exponential backoff", but `retry` waits a fixed `delayMs` between attempts. In `runSync` that adds up to 800 ms before the final error.
- **Every error is retried:** A permanent failure also calls `fetchFn` 5 times before it surfaces.
- **Missing coverage:** No test checks that `runSync` retries after a failure, and none checks the delay.

I ended the file with the "Generated with Claude Code" line, as the attribution rule for PR descriptions requires.