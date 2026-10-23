I saved the PR description to `PR.md`. It says "Tests pass", going on your word that CI was green. I didn't run the tests myself.

Two things on the branch don't match its commit messages, so I described the code as it is:
- **`exportCsv`:** The commit says "remove legacy exportCsv", but the diff only adds a `console.warn` deprecation message. `PR.md` says it isn't removed.
- **Tests:** The commit says "add tests for lowStock", but the branch only adds a fixture, `test/fixtures/items.json`. `test/stock.test.js` already exists on main and isn't changed by this branch, so I'm not sure `lowStock` has any test coverage. Check that before you say tests pass.

You may want to fix the commit messages, or confirm the `exportCsv` change is what you intended.