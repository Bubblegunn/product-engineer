I saved the description to `PR.md`. It says "Tests pass in CI," as you asked. I didn't run anything myself, so that rests on your last look at CI.

The branch has a few mismatches that reviewers could trip on, so I described the diff as it actually is:
- **No new tests:** the commit "add tests for lowStock" only adds `test/fixtures/items.json`. I added a note saying so. Delete it if you'd rather add tests first.
- **`exportCsv` isn't removed:** the commit "remove legacy exportCsv" only adds a `console.warn` deprecation line. The PR says "logs a deprecation warning."

If you want to fix the commit messages before opening the PR, I can do that.