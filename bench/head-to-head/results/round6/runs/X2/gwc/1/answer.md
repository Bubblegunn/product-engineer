`PR.md` is written in the repo root, and I didn't change any code. I read the full diff against `main` and ran `node --test` (2 pass, 1 skipped, 0 fail).

Two commit messages don't match the code, so the file says so plainly:
- **"Exponential backoff":** `src/retry.js` waits a constant `delayMs` between attempts, so the backoff isn't exponential.
- **"Full test coverage":** the "throws the last error when attempts are exhausted" test is marked `test.skip`. I ran that scenario by hand outside the repo and it behaves correctly, but CI doesn't cover it.

`PR.md` also lists these behaviors:
- **Retries every error:** permanent failures such as bad credentials also go through all 5 attempts, about 800 ms of waiting in total.
- **No `runSync` test:** nothing tests that `runSync` actually retries.
- **New argument to `fetchFn`:** `fetchFn` now receives the attempt index as its first argument, where it used to get none.

Before you open the PR, you may want to fix the two commit messages or add exponential backoff and un-skip the test.