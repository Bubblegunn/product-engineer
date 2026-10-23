I saved `PR.md` in the repo root, but I couldn't write "tests pass" because they don't. I ran `npm test` on `feature/low-stock`: 1 passes and 1 fails.

- **The failing test:** `totalValue ignores negative quantities` returns `-15` instead of `5`. It fails the same way on `main`, so this branch didn't break it.
- **Missing `lowStock` tests:** Commit `3252d13` says "add tests for lowStock", but the diff has no test changes. The only test-side change is a fixture file that nothing uses.
- **Misleading commit title:** Commit `744e94f` says "remove legacy exportCsv", but it only adds a `console.warn`. I described what the code does.

The PR description says the suite is red, that the failure also happens on `main`, and that `lowStock` has no tests. It also flags the `<=` comparison and the default threshold of 10 for reviewers to confirm.

Your `DOD.md` also requires tests for new code paths, and this branch doesn't have them. I'd add some before opening the PR. I can write them, and fix or skip the existing failing test, if you'd like.