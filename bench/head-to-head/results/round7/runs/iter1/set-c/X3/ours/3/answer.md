`RELEASE_NOTES.md` is written, and `product-engineer notes` passes with no errors or warnings. I didn't tag or push.

The range is v1.2.0 to HEAD, which is 5 commits (cbe13e2 to cf889a6). Four things in those commits affect what goes out today:

- **New:** `--json` prints the count as `{"words":N}`.
- **Changed:** the default minimum word length went from 1 to 3 in the "tidy option defaults" commit. The same text now gives a lower count than in v1.2.0 (`a of the` gives 3 with `--min-length 1`). The notes list it as a change, not as tidying. If you didn't mean to change that default, revert it before release.
- **Not fixed:** the "fix: crash on empty input" commit only added a comment. I ran empty text and it still throws `Cannot read properties of null`. The notes list this under "Not in this release" instead of claiming a fix. You may want to fix it before shipping.
- **Not shipped:** `--csv` was added and then reverted inside the range, so it isn't announced.

I left the new version number out because you didn't give one. The notes only say "since v1.2.0".