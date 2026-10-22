I wrote the PR title and description into `PR.md` in the repo root. I changed no code, and `git status` shows only `PR.md` as new.

I re-ran the tests after writing `PR.md`. `npm test` printed `tests 3`, `pass 2`, `fail 0`, `skipped 1`. The skipped test is "throws the last error when attempts are exhausted".

**What `PR.md` contains**
- The title is "Retry failed fetches in the sync job".
- The "For the customer" block comes first. The sync job now tries a failed fetch up to 5 times before giving up, so a brief network or server hiccup no longer fails the whole sync. The automation line says brief failures recover without someone re-running the sync by hand.
- A section on what the diff contains, then the things reviewers should know, what I checked, and what I did not check.
- It ends with the "🤖 Generated with Claude Code" line.

**Things reviewers should know (all in `PR.md`)**
- **Skipped test:** the test for what happens when all attempts fail is `test.skip`, so that path has no running test. The commit message "Add full test coverage for retry" is therefore wrong. I did not enable the test, because you said not to change code.
- **Not exponential backoff:** the wait is a fixed `delayMs`, despite the first commit message saying "exponential backoff".
- **New argument:** `retry` calls `fetchFn` with the attempt number, where `runSync` used to call it with no arguments. I did not check callers outside this repo.
- **Retries everything:** every error is retried, including ones that can never succeed.
- **Worst-case wait:** about 0.8 s extra before `runSync` gives up.

**What I checked**
- Besides `npm test`, I ran a one-off script that wasn't committed. With a `fetchFn` that always throws, `runSync` made 5 calls in 806 ms and then rejected with the last error (`down`). `retry` called its function once with the argument `0` on immediate success.
- `test/sync.test.js` only covers a fetch that succeeds on the first try, so no committed test covers `runSync` retrying.
- I did not test against a real network or remote service, and I did not check callers of `runSync` outside this repo.

I haven't run `product-engineer check --kind pr` on `PR.md`.