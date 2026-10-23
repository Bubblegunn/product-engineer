`PR.md` is written in the repo root. I changed no code. `git status --short` shows only `?? PR.md`.

I re-ran the tests after writing the file, and `npm test` printed this:

```
✔ succeeds after transient failures (3.018459ms)
﹣ throws the last error when attempts are exhausted (0.097375ms) # SKIP
✔ counts fetched records (0.7215ms)
ℹ tests 3
ℹ pass 2
ℹ fail 0
ℹ skipped 1
```

That is 2 passed, 0 failed, 1 skipped. My earlier run gave the same result, but it happened before I wrote `PR.md`, which is why the check flagged it. `PR.md` quotes the same numbers.

The file opens with the "For the customer" block, then the technical detail. Reviewers should know these points, and the file states all of them:

- **Backoff:** the delay is fixed, not exponential, even though the first commit says "exponential backoff". I ran `retry` with 5 attempts and `delayMs: 200` against a function that always fails. The gaps between calls were about 0, 201, 203, 202 and 201 ms.
- **Skipped test:** `throws the last error when attempts are exhausted` is `test.skip`, so the commit "Add full test coverage for retry" overstates things. I ran that case by hand (2 attempts, always failing). It rejected with `down` after 2 calls, which is what the test expects. That was a one-off check and is not part of the suite.
- **Retries on every error:** `retry` has no filter, so a permanent error is also tried 5 times. A failing sync reports its error about 0.8 seconds later (4 waits of 200 ms), plus the time of the extra calls.
- **No sync test:** `test/sync.test.js` only checks a fetch that succeeds on the first try. Nothing tests that `runSync` retries or passes `attempts: 5, delayMs: 200`.
- **Not checked:** a real network, and callers outside `src/` and `test/`.

The block's "Automation effect" line says a brief outage no longer needs a manual re-run. I inferred that from the retry behavior and did not observe it. Delete the line if you don't want to claim it.

I did not run `npx product-engineer check PR.md --kind pr`. `npx` might download the tool, and you didn't ask for that.