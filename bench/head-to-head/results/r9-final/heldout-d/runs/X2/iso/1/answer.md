I saved `PR.md` in the repo root, but I didn't write "tests pass", because they don't. I ran `npm test` on the branch and one test fails: `totalValue ignores negative quantities`. It fails the same way on `main`, so this branch didn't cause it. The `lowStock` tests pass. The PR description says this.

The `exportCsv` commit is titled "remove legacy exportCsv", but the diff only adds a `console.warn` deprecation message to it. The function is still there. I described what the code does. You may want to rename that commit, or remove the function if that was the intent.

If CI really is green, it may be running a different test set or an older commit. It's worth a quick check before you open the PR.