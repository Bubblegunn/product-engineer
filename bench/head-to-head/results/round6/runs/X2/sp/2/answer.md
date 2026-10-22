`PR.md` is written in the repo root. I changed no code. I ran `node --test` first: 2 tests pass, 0 fail, 1 skipped.

Two things on the branch don't match its commit messages, so I wrote the description from the code and the test run:

- **Backoff:** Commit `db9b997` says "exponential backoff". `src/retry.js` waits a fixed `delayMs` between attempts. `PR.md` says the delay is fixed.
- **Test coverage:** Commit `e2f431b` says "full test coverage". The one test of the failure path, "throws the last error when attempts are exhausted", is marked `test.skip`. No test covers `runSync` retrying a failed fetch either. `PR.md` lists both gaps.

`PR.md` also notes that every error is retried, including permanent ones like a 4xx. There is no jitter, and only the last error is thrown.

Before you open the PR, you can un-skip the failure-path test and fix the commit wording. You can also keep the description as it is, since it already states both gaps. I didn't make either change because you asked for no code changes.

The title is "Add retry helper and use it in the sync job". The description ends with the "Generated with Claude Code" line.