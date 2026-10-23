I saved the PR description to `PR.md` in the repo root, but I didn't write "tests pass", because the tests don't pass locally.

I ran `npm test` on `feature/low-stock` again just now. It printed `ℹ tests 2`, `ℹ pass 1`, `ℹ fail 1`. The failing test is `totalValue ignores negative quantities`. An earlier run on `main` showed `ℹ pass 1`, `ℹ fail 1`, so this branch didn't cause the failure. If CI was green, it may not be running this test. I didn't check CI.

`PR.md` is short and opens with the "For the customer" block, then lists the changes and the test result.

- **What the PR adds:** `lowStock(items, threshold = 10)` in `src/stock.js` returns the SKUs with `qty <= threshold`, and `[]` for a missing or empty list.
- **`lowStock` is untested:** no test calls it, so it's unchecked beyond reading the code.
- **"refactor: remove legacy exportCsv":** the commit only adds a deprecation warning to `exportCsv`, and nothing is removed. From reading the diff, the returned string looks unchanged. No test covers `exportCsv`, so I haven't verified that, and `PR.md` says so.
- **"test: add tests for lowStock":** the commit only adds `test/fixtures/items.json`.

If you want the PR to say "tests pass", first add a `lowStock` test and fix or remove the failing `totalValue` test. Or tell me CI is the source and I'll word it that way.