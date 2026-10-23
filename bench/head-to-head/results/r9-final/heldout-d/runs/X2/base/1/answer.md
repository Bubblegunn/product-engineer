I saved `PR.md` in the repo root, but I didn't write "tests pass", because they don't.

I ran `npm test` on `feature/low-stock` and one test fails: `totalValue ignores negative quantities` (got -15, expected 5). That test is in `test/stock.test.js`, which the branch doesn't change, and `totalValue` is unchanged too. The failure probably predates the branch, but I didn't run the tests on `main` to confirm. Your CI result may have been from an earlier run. The PR description says this plainly.

Two other things in the diff don't match the commit messages, and `PR.md` notes both:
- **`exportCsv` isn't removed.** The "remove legacy exportCsv" commit only adds a deprecation `console.warn`.
- **There are no `lowStock` tests.** The "add tests for lowStock" commit only adds a fixture file, `test/fixtures/items.json`.

If you'd rather have a plain "tests pass" line, check CI first. I can also add `lowStock` tests, or fix or drop the failing `totalValue` test, before you open the PR.