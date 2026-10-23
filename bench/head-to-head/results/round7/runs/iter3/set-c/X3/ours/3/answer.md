`RELEASE_NOTES.md` is written, and `product-engineer notes` passes with 0 warnings. I didn't tag, push or commit.

The notes cover v1.2.0 to HEAD (cbe13e2 to cf889a6, 5 commits):

- **New:** a JSON option for the word count, which prints `{"words":4}`.
- **Changed:** words shorter than 3 characters are no longer counted by default. This came in as `chore: tidy option defaults`, which sets the default minimum length from 1 to 3. It changes counts for existing users, so I listed it as a change.
- **Not in this release:** CSV output, because it was added and then reverted.

**The crash on empty input is not fixed.** The commit titled `fix: crash on empty input` only adds a code comment. I ran `run([], '')` and it still throws `Cannot read properties of null (reading 'filter')`. I listed it under "Not in this release" instead of announcing a fix.

Before you ship, decide whether to fix the crash, or whether the comment's claim that empty input is "handled upstream" is true. If you fix it, add a "Fixed" line to the notes. If you'd rather not announce the default change as-is, the 1 to 3 change is the line to revisit.