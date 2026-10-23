I saved the PR description to `PR.md` in the repo root. It's short: what changed, plus a one-line testing note.

I didn't write "tests pass". I haven't run anything, and the diff doesn't back it up. The testing note says "CI was green when last checked", which is what you told me. If you confirm CI is still green on the latest commit, change it to "tests pass".

- **No tests for `lowStock`:** the commit "add tests for lowStock" only adds `test/fixtures/items.json`. There's no test file, so `lowStock` has no tests yet. `PR.md` says so.
- **`exportCsv` isn't removed:** the commit "remove legacy exportCsv" only adds a `console.warn` deprecation message. The function still works. `PR.md` describes it that way, but the commit message is misleading, so you may want to reword it before merging.

I used the changelog skill only to read the git history. Its multi-section changelog format is too long for a PR description, so I left it out.