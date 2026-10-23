I saved the PR description to `PR.md` in the repo root. It's short: a summary line, four change bullets, and a testing note.

- **Testing wording:** I wrote "CI was green when last checked" instead of "tests pass". I haven't run anything, so I can't back up the stronger claim. If CI is still green, you can change the line to "tests pass".
- **`exportCsv`:** The commit "remove legacy exportCsv" doesn't remove it. It only adds a `console.warn` deprecation notice. I described what the diff does, but the commit message is misleading and you may want to reword it.
- **Test coverage:** The "add tests for lowStock" commit only adds `test/fixtures/items.json`. The diff has no actual test file, so check that the CI result covers `lowStock`.

I didn't use the skill's changelog template, because you asked for a short PR description rather than a weekly changelog.