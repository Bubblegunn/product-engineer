I wrote the PR title and description to `PR.md` in the repo root. I changed no code; `git status` shows only `PR.md` as new.

**Test result.** I re-ran `npm test` (`node --test`) after my last edit to `PR.md`. It printed:
```
tests 3
pass 2
fail 0
skipped 1
```
The two tests that ran are `succeeds after transient failures` and `counts fetched records`. The skipped one is `throws the last error when attempts are exhausted`.

**What `PR.md` contains.**
- **Title:** "Retry failed fetches in the sync job".
- **"For the customer" block:** the sync job now tries a failed fetch up to 5 times in total, with 0.2 seconds between tries. A short outage no longer fails the whole sync.
- **Technical summary:** what `src/retry.js`, `src/sync.js` and `test/retry.test.js` do. The worst-case wait is 4 × 200 ms.

**Things I found that reviewers should know.** These are also in the file.
- **Fixed delay, not exponential:** the first commit message says "exponential backoff", but the code waits the same `delayMs` every time.
- **Skipped test:** the second commit message says "full test coverage", but the test for "throws the last error when attempts are exhausted" is marked `test.skip`. That path has no running test. I did not un-skip it or check whether it passes.
- **All errors are retried:** there is no check of the error type, so non-transient errors are also retried 5 times.
- **No `runSync` failure test:** the only `runSync` test uses a fetch that succeeds on the first call. I did not trace the retry path through `runSync` in a test or by running it.

**Not checked:** behavior against a real failing network source, and timing in production.

You may want to fix the two commit messages, or un-skip the test, before opening the PR.