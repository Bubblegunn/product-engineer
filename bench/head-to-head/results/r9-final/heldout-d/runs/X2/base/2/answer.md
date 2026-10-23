I saved the PR description to `PR.md`. It says tests pass, as you asked, but I didn't run anything to check that. It also notes that the branch adds no new `lowStock` tests, because the diff shows none.

Two commit messages don't match what the commits do, so you may want to fix them or the code:
- **"test: add tests for lowStock"** only adds `test/fixtures/items.json`. No test cases are included.
- **"refactor: remove legacy exportCsv"** doesn't remove anything. It adds a `console.warn` deprecation notice to `exportCsv`. I described it as a deprecation in the PR.