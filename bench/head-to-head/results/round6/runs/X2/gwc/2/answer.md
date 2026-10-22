`PR.md` is in the repo root. I changed no code and did not commit it.

The description is based on the diff and a run of `npm test`, not on the commit titles. Two commit titles don't match the code, and the file says so:

- **No exponential backoff:** `db9b997` is titled "exponential backoff", but the code waits a fixed `delayMs` between attempts. The sync job gets 5 attempts with 200 ms between them.
- **Coverage is not full:** `e2f431b` is titled "full test coverage". The test for the case where all attempts fail is `test.skip`, so it doesn't run. `npm test` shows 2 passed, 0 failed, 1 skipped. Nothing tests that `runSync` retries.

The file also lists three behaviors reviewers should know about:

- Every error is retried, including permanent ones.
- `fetchFn` now receives the attempt number as an argument.
- A failing sync takes about 800 ms longer to fail than before.

Under "Open items" it asks reviewers whether to enable the skipped test and whether a fixed delay is acceptable. I did not check whether the skipped test passes when enabled, and the file says that.

You may want to enable the test or rename those two commits before you open the PR.