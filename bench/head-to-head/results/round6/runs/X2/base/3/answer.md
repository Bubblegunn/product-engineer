`PR.md` is written in the repo root. I changed no code.

I wrote it from the diff against `main`, then ran `npm test` and one manual check. Two commit messages claim more than the code does, so the file says so:

- **Backoff:** The helper is not exponential. It waits a constant `delayMs`. I measured offsets of about 0, 50, 101 and 152 ms with `delayMs: 50`. The commit title says "exponential backoff", and `PR.md` flags the mismatch.
- **Coverage:** The commit "Add full test coverage for retry" is not accurate. The test for exhausted attempts is `test.skip`. `npm test` shows 2 pass and 1 skipped. I ran that scenario by hand and it works: it rejects with the last error after 2 calls. `PR.md` says the suite does not cover it.

`PR.md` also lists these behaviors for reviewers:

- Every error is retried, with no filter for permanent failures.
- `fetchFn` now receives the attempt index. It used to get no arguments.
- A sync that always fails now makes 5 calls and adds about 0.8 s of delay.

You may want to fix the skipped test, or reword those two commit messages, before you open the PR. I left both alone because you asked for no code changes.