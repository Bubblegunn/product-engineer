I wrote `PR.md` in the repo root and changed no code. I checked its claims against the diff and a `node --test` run. I also read `test/sync.test.js` to confirm that no test covers the retry wiring.

Two facts in the PR contradict the commit history, and the PR says so up front:

- **Fixed delay:** The first commit says "exponential backoff", but `src/retry.js` waits the same `delayMs` between every attempt.
- **Skipped test:** The commit "Add full test coverage for retry" includes a `test.skip` for the exhausted-attempts path. The test run shows 2 passed, 0 failed and 1 skipped. I did not run the skipped test, so the PR says its result is unknown.

The PR also notes these behaviours:

- **All errors retried:** Every error is retried, including permanent ones such as bad credentials.
- **Added delay:** A fetch that always fails now takes at least 800 ms longer to fail.
- **No timeout:** `retry` does not limit how long one call takes.
- **Repeated calls:** One sync can now send up to 5 requests. I did not check whether `fetchFn` is safe to repeat, and the PR says so.

The title is "Add retry helper and use it in the sync job", and it makes no claim about exponential backoff. I applied the ISO 24495-1, -3 and -5 skills. The PR is short, so it has no table of contents.

Before you open the PR, decide whether to un-skip that test or leave it and explain why. The PR currently tells reviewers to do one of those two things.