I saved the PR description to `PR.md`, but I didn't write "tests pass", because they don't when I run them.

- **Failing test:** `npm test` on `feature/low-stock` fails `totalValue ignores negative quantities`. It gets -15 where the test expects 5. This branch doesn't change `totalValue`, so the failure may already exist on `main`. I didn't run the tests on `main`. It doesn't match the green CI you saw, so it's worth checking which result is current.
- **No `lowStock` tests:** the "add tests for lowStock" commit only adds a fixture file, so the new function is untested.
- **Misleading commit message:** "remove legacy exportCsv" only adds a deprecation `console.warn`, and `exportCsv` is still there. The description says this.

The description is short and covers the new function, the three changed files and the testing gaps. If you'd rather it say tests pass, I'll change it once the suite is actually green.