I wrote the PR title and description to `PR.md` in the repo root, and I changed no code. `git status` shows only `PR.md` as new. The "For the customer" block comes first, then a technical summary.

I ran `npm test` again after writing the file. This is the output as printed:

```
✔ succeeds after transient failures (5.478916ms)
﹣ throws the last error when attempts are exhausted (0.106958ms) # SKIP
✔ counts fetched records (1.495833ms)
ℹ tests 3
ℹ pass 2
ℹ fail 0
ℹ skipped 1
```

`PR.md` states this result. It also flags three problems you may want to fix before opening the PR:

- **Skipped test:** "throws the last error when attempts are exhausted" is marked `test.skip` in `test/retry.test.js`. The commit "Add full test coverage for retry" overstates what is covered, because no running test checks that the last error is rethrown after the final attempt.
- **Commit message vs. code:** the first commit says "exponential backoff", but the code waits a constant `delayMs` between attempts. `PR.md` says the delay is constant. You could reword that commit message.
- **Retry scope:** every error is retried, up to 5 attempts, with about 0.8 seconds of total waiting. The customer block says outages longer than that still fail the sync.

No test calls `runSync` with a failing `fetchFn`, so the new wiring in `src/sync.js` has no test. I did not run the sync against a real data source, did not open the file holding "counts fetched records", and did not check other callers of `runSync`. `PR.md` lists these under "Not checked".

I left out an "Automation effect" line because I saw no evidence that anyone was re-running failed syncs by hand.