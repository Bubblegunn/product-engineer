I wrote the PR title and description into `PR.md` in the repo root, and I changed no code. I re-ran the tests after my last edit. `git status` shows `PR.md` as the only change.

Test output as printed: `ℹ tests 3`, `ℹ pass 2`, `ℹ fail 0`, `ℹ skipped 1`.

**Title:** "Retry failed fetches in the sync job (up to 5 attempts)".

**Description:** It opens with the plain-language "For the customer" block. A short summary of the diff follows, then what I ran, what I did not check, and what was not built.

Three things in it might surprise you:

- **Skipped test:** The test "throws the last error when attempts are exhausted" is marked `test.skip` in this branch. The path where every attempt fails and the last error is rethrown has therefore not been tested. I read that code and it looks right, but no test has run it. The commit title "Add full test coverage for retry" is inaccurate, and `PR.md` says so. Un-skip the test before you open the PR if you can.
- **Backoff:** `retry` waits a fixed `delayMs` between attempts. The commit title says "exponential backoff", but the wait does not grow. `PR.md` says this plainly.
- **Not checked:**
  - I did not check whether the real fetch function is safe to call more than once.
  - I did not check whether it ignores the new attempt-number argument.
  - I did not run the sync job against a real server.
  - `retry` retries every error, including permanent ones. `PR.md` lists each of these.

I counted 35 lines added and 1 removed from the diff. My first draft said 36, and I corrected it before finishing.