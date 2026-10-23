I saved the description to `PR.md`. I didn't write "tests pass" outright. I wrote "CI was green at last check", because I haven't run anything myself and your CI check may be out of date.

I found three things in the branch you may want to fix before review:
- **No `lowStock` tests:** commit `3252d13` is titled "add tests for lowStock", but it only adds `test/fixtures/items.json`. No test file uses it, so a green CI doesn't show that `lowStock` works.
- **Misleading commit title:** `744e94f` says "remove legacy exportCsv", but it only adds a `console.warn` deprecation message to `exportCsv`. The PR description says what the code does, not what the commit title says.
- **Possible noisy warning:** if anything calls `exportCsv`, it will now print that warning on every call.

If you want, I can add real tests for `lowStock` or reword those two commit titles.