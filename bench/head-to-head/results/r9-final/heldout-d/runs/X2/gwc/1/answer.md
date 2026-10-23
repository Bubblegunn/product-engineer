I saved `PR.md` in the repo root, but it doesn't say tests pass. When I ran `npm test` on `feature/low-stock`, one test failed: `totalValue ignores negative quantities` returns -15 where it expects 5. I didn't check whether it also fails on main. It tests `totalValue`, which this branch doesn't change, so it's probably already failing there. Your green CI may have been from an earlier commit.

The branch also has two mismatches with its commit messages, and I put both in the description:
- **No `lowStock` tests:** "add tests for lowStock" only adds a fixture file, so `lowStock` has no tests.
- **`exportCsv` still exists:** "remove legacy exportCsv" actually adds a deprecation `console.warn` to it.

I kept the description short. If you fix the failing test or add the `lowStock` tests, update the Testing section before you open the PR.