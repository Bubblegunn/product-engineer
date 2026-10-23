I saved `PR.md` in the repo root, but I didn't write "tests pass", because they don't when I run them here.

- **Test result:** `npm test` gives 1 pass and 1 fail, both on `feature/low-stock` and on `main`. The failing test is `totalValue ignores negative quantities`, which fails because `totalValue` doesn't skip negative quantities. The branch didn't cause it. The PR says this plainly. If CI was green, it may have run on a different commit or a different config, so check that before merging.
- **No `lowStock` tests:** the commit "add tests for lowStock" only adds a fixture file. `test/stock.test.js` is unchanged, and nothing uses the fixture.
- **`exportCsv` still exists:** the commit "remove legacy exportCsv" only adds a `console.warn` to it. I described the diff as it is, and the PR suggests squashing the commits.

`PR.md` is untracked on `main`, and I haven't committed it. If you want a different framing, tell me and I'll edit it.