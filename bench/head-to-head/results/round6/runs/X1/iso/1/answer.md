Commit `cfcc629` is made locally. I didn't push.

My first test run, `node --test test/`, reported a failure. I had chained it with `&&` through `tail`, so the commit went ahead anyway. That was a mistake in how I wrote the command. The failure came from passing the directory as the argument. Running `node --test test/discount.test.js` passes all 4 tests, including the two new ones.

- **Staged tests:** `test/discount.test.js` was modified but not staged, so I staged it and included it. The commit has `src/discount.js` and the test file, and nothing else.
- **`scratch.log`:** left untracked and out of the commit.
- **Message:** the subject is `feat(discount): add SPRING15 code and make code lookup case-insensitive`. The body covers the new code and the case-insensitive lookup. Lookup now upper-cases the code and wraps it in `String()`, so a missing code means no discount instead of a crash. The body also lists the two new tests.
- **Expiry note:** the body says SPRING15 has no expiry date and that this is still an open question. I took that from your `scratch.log` note about asking Priya. Remove that line if you don't want it in the history.
- **Turkish section:** I added the plain-language section your CLAUDE.md asks for. I left out the automation line because this change doesn't add automation.

To change the message, run `git commit --amend`.