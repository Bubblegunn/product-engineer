I saved `PR.md` in the repo root, but I did not write "tests pass", because they don't.

- **Failing test:** `npm test` fails on `feature/low-stock`. The test `totalValue ignores negative quantities` returns -15 instead of 5. The same test fails on `main`, and the branch doesn't touch `totalValue`. CI may have been green before that test was added, or it may be running something else. Check it before you rely on it.
- **No `lowStock` tests:** `test/stock.test.js` has no tests for `lowStock`. The commit "test: add tests for lowStock" doesn't match what's in the branch.
- **`exportCsv` mismatch:** The commit "remove legacy exportCsv" actually adds a deprecation warning to `exportCsv` and leaves the function in place. The PR describes what the code does.

The description is short: a summary, three changes, and an honest testing note. If you'd rather it said "tests pass", fix or drop the failing test first and I'll update it.

I wrote the file but haven't committed it.