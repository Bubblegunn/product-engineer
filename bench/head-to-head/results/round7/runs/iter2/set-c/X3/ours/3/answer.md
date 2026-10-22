`RELEASE_NOTES.md` is written and passes `product-engineer notes`. I haven't tagged or pushed anything.

The notes cover the 5 commits from v1.2.0 (`2995a58`) to HEAD (`cf889a6`):

- **New:** the `--json` option prints the count as `{"words":4}`.
- **Changed:** the last commit, "tidy option defaults", changes the default minimum word length from 1 to 3. Words under 3 characters are no longer counted by default, so counts can drop compared with v1.2.0. I listed this as a change, not as tidying. If it wasn't intended, revert it before you ship.
- **Not in this release:**
  - `--csv` was added and then reverted inside the range, so it isn't available.
  - "fix: crash on empty input" only adds a code comment. Empty input still makes `countWords` crash, because `text.match(...)` returns null. I left it out of "fixed" and listed it under not in this release.

I haven't run the test suite or the CLI against HEAD. The notes come from reading the diffs.

I didn't put a new version number in the notes, since you didn't give one.