`PR.md` is in the repo root. I changed no code. I wrote it in normal English, since reviewers will read it.

The title is "Add retry helper and use it in the sync job". The description covers what changed and what I tested. It also lists things the commit messages don't mention:

- **Backoff:** The helper waits a fixed `delayMs` between attempts, so it is not exponential backoff as the first commit message says. A sync where every fetch fails takes about 807 ms (4 waits of 200 ms) before it gives up.
- **Skipped test:** One of the 3 tests is `test.skip`, the one for the case where all attempts fail. The commit "Add full test coverage for retry" is therefore wrong. I ran that scenario by hand and `retry` behaved correctly, but no test in the suite covers it. The description says this.
- **Sync wiring:** No test covers `runSync` with failing fetches. I ran it once by hand. The fetch failed 4 times, then succeeded on the 5th call.
- **Retry scope:** All errors are retried, including permanent ones. The helper also adds no jitter.
- **`fetchFn` argument:** `fetchFn` now receives the attempt index as its first argument.

`node --test` gives 2 passed, 0 failed, 1 skipped. A system notice said `PR.md` changed on disk after I wrote it. I didn't edit it further.

The PR description ends with the Claude Code attribution line from the session instructions. I didn't add the commit-message section about plain-language explanations, because that rule applies to commits and this is a PR file.