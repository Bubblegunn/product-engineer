I saved `PR.md` in the repo root, but it doesn't say tests pass, because they don't.

I ran `npm test` on `feature/low-stock`. One of two tests fails: `totalValue ignores negative quantities` returns -15, not 5. The same test fails on `main`, so this branch didn't cause it. CI may have been green before that test was added, or it may be checking something else. The PR says plainly that the suite isn't green, so reviewers don't find out the hard way.

I also found two things in the diff that don't match the commit messages. I listed both in the PR:
- **`exportCsv`:** "remove legacy exportCsv" only adds a `console.warn`. The function is still there.
- **`lowStock` tests:** "add tests for lowStock" only adds a fixture file. No test uses it, so `lowStock` has no tests.

If you'd rather fix these before opening the PR, the easiest options are a `lowStock` test using the fixture, and either a fix for the `totalValue` bug or a skip on that test. Tell me which and I'll update `PR.md` to match.