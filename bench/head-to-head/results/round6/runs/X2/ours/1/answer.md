`PR.md` is in the repo root. I changed no code, and `git status` shows only `PR.md` as new. I ran the tests again after my last edit. `npm test` printed `tests 3`, `pass 2`, `fail 0`, `skipped 1`. I did not run the sync job against a real data source.

The title is "Retry failed fetches in the sync job". The plain-language "For the customer" block comes first, then a section on what the diff shows, then the test results. The "Generated with Claude Code" line is at the end, as the attribution rules ask.

I wrote the file so reviewers don't have to take the commit messages on trust. These are the places where the code and the commit messages disagree:

- **No exponential backoff:** The wait between tries is a fixed 200 ms in the sync job. The commit "Add retry helper with exponential backoff" is wrong about that. The PR says so and does not claim backoff.
- **Skipped test:** The commit "Add full test coverage for retry" is only partly true. The test for giving up after the last attempt is marked `test.skip`. I ran it un-skipped from a temporary copy outside the repo, and it passed. Consider removing the `.skip` before you merge.

The PR also lists three things I did not check or that behave differently from before:

- **Changed call:** `fetchFn` now receives the attempt number as an argument. I did not check whether any real caller reads its arguments.
- **Retries every error:** The sync job retries on any error, including ones that can never succeed.
- **No test of sync retries:** No test covers the sync job retrying.