I wrote the title and description into `PR.md` in the repo root. I didn't change any code. `git status --short` shows only `?? PR.md`.

I re-ran `npm test` after writing the file. It printed:

```
ℹ tests 3
ℹ pass 2
ℹ fail 0
ℹ skipped 1
```

The skipped test is "throws the last error when attempts are exhausted".

**Title:** "Retry failed fetches in the sync job"

**What the file contains**
- **"For the customer" block:** it opens the file. When the sync job's fetch fails, it now tries up to 5 times in total, waiting a fixed 200 ms between tries. A short hiccup no longer fails the whole sync.
- **What each file in the diff does:**
  - `src/retry.js` is new.
  - `src/sync.js` now calls `retry` instead of calling the fetch directly.
  - `test/retry.test.js` is new.
- **Test result:** the `npm test` output above.

**Problems in the branch, listed in the file for reviewers**
- **Delay is fixed:** the first commit says "exponential backoff", but the code waits the same time between every try.
- **One test is skipped:** the "all attempts fail" test uses `test.skip`, so the "Add full test coverage for retry" commit title is wrong.
- **Sync retry is untested:** no test checks that `runSync` retries.
- **New argument:** `fetchFn` now receives the attempt number, which it didn't before. I didn't check whether any real caller reads its arguments. Only the test double exists in this repo.
- **All errors are retried:** this includes errors that can never succeed on a retry, such as bad credentials.

**Not checked, also stated in the file**
- I didn't run the sync job against a real or failing data source, so real timing and behaviour on repeated failures are unverified.
- I didn't trace callers of `runSync` outside this repo.

The `product-engineer check --kind pr` tool reported no errors and one warning. It says the numbers in the "What changed" line have no method or scope next to them. They come straight from `src/sync.js`, so I left them.

You may want to fix the skipped test and the commit message wording before you open the PR. If you leave them, the file already tells reviewers about both.