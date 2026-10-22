`PR.md` is written in the repo root. It is the only change, and I didn't touch any code. I also confirmed the PR's claims against the code and the test output.

The PR description tells reviewers about these problems:
- **Backoff is constant, not exponential.** `retry` waits the same `delayMs` before every retry. I ran it with `delayMs: 50`, and the gaps were about 51, 52 and 51 ms. The commit message for `db9b997` says "exponential backoff", which is wrong.
- **One retry test is skipped.** The exhaustion test is marked `test.skip`, so the commit message "full test coverage" for `e2f431b` is wrong. I ran that case by hand, and it threw `down` after exactly 4 calls. No automated test covers it.
- **Every error is retried.** A permanent error in `runSync` is retried 5 times, which adds about 800 ms before it surfaces.
- **`fetchFn` now receives an argument.** `retry` calls `fn(i)` with the attempt index, so `fetchFn` gets a number where it used to get nothing.

`npm test` shows 3 tests: 2 passed, 0 failed, 1 skipped.

I described the constant-delay and skipped-test problems in the PR instead of fixing them, because you said not to change code. You may want to fix them, or reword the commit messages, before you open the PR.