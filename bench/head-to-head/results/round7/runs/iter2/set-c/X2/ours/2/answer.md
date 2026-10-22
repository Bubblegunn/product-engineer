`PR.md` is written in the repo root. I changed no code, and `git status` shows `PR.md` as the only new file.

I re-ran `npm test` after writing the file. The printed result:

```
✔ succeeds after transient failures (3.277708ms)
﹣ throws the last error when attempts are exhausted (0.159708ms) # SKIP
✔ counts fetched records (1.19475ms)
ℹ tests 3
ℹ pass 2
ℹ fail 0
ℹ skipped 1
```

So 2 passed, 0 failed, 1 skipped. "Pass" here does not cover everything: the skipped test is the one for the give-up path. I did not run the retry against a real or simulated failing fetch. I also did not open `test/sync.test.js`, so I don't know whether it covers the retry path in `runSync`.

`PR.md` opens with the plain-language "For the customer" block. Below it are the diff summary, the test result and these caveats, because reviewers rely only on that file:
- **The wait is constant, not exponential.** The commit message says "exponential backoff", but the code sleeps the same `delayMs` between attempts.
- **One retry test is skipped.** The test "throws the last error when attempts are exhausted" is marked `test.skip`, so the give-up path has no running test. The commit "Add full test coverage for retry" overstates this. I read that path and it looks correct, but I did not run it.
- **Every error is retried.** That includes permanent failures like a bad request, and it adds up to 800 ms of waiting before the error reaches the caller.
- **`fetchFn` now receives the attempt number as its argument.** I did not check whether any real caller uses that first argument for something else.

The commit message and the skipped test are both in your branch. You may want to fix them before opening the PR. I left them alone because you said not to change code.