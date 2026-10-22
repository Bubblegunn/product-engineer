`PR.md` is written in the repo root. I didn't change any code. `git status --short` shows only `?? PR.md`.

**Test result.** I re-ran `npm test` after my last edit to `PR.md`. The output was `ℹ tests 3`, `ℹ pass 2`, `ℹ fail 0`, `ℹ skipped 1`. This matches the numbers in `PR.md`. My earlier run came before I appended the attribution line, which is why the check flagged it.

**What `PR.md` contains.**
- The title is "Retry failed fetches in the sync job". The plain-language "For the customer" block comes right after it.
- A summary of the diff. It covers 3 commits and 3 files, with 35 lines added and 1 removed. The new `retry` helper is in `src/retry.js`, `runSync` now calls it with 5 attempts and 200 ms in `src/sync.js`, and the tests are in `test/retry.test.js`.
- A "Things reviewers should know" section and a "Test status" section.
- A "Not checked" section.
- The Claude Code attribution line at the end.

**Findings that reviewers should see (all in `PR.md`).**
- **The backoff is not exponential.** The commit "Add retry helper with exponential backoff" describes a growing delay, but `retry.js` sleeps a constant `delayMs` between attempts.
- **The exhaustion test is skipped.** The test "throws the last error when attempts are exhausted" is marked `test.skip`, so the commit "Add full test coverage for retry" overstates what is tested. I did not run that test.
- **No test covers the retry wiring in `runSync`.** The existing `sync.test.js` only uses a fetch function that succeeds on the first call. No test checks the 5 attempts or the 200 ms delay.
- **Every error is retried.** Permanent errors are also tried 5 times. The worst-case added wait is about 800 ms. I calculated that from the code and did not measure it.
- **`retry` passes an attempt index to the fetch function.** I did not check whether any caller is affected.

**Not checked.**
- Behavior against a real failing network or server.
- The skipped test.
- Callers of `runSync` outside this repo.
- I couldn't run `product-engineer check PR.md --kind pr` because the package isn't installed and `npx` wouldn't fetch it. The "For the customer" block comes right after the title, so it should pass the "within 12 lines" rule, but I haven't confirmed that.

If you'd rather fix the commit title or un-skip the test before opening the PR, I can adjust the description to match.