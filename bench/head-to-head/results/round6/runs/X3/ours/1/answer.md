`RELEASE_NOTES.md` is written and passes `product-engineer notes`. I didn't tag, push or commit.

The range is v1.2.0 (2995a58) to cf889a6. The notes say:

- **New:** you can get the word count as JSON, for example `{"words":4}`.
- **Changed:** words shorter than 3 characters are no longer counted by default. This comes from the "chore: tidy option defaults" commit, which changed the default minimum word length from 1 to 3. It changes results for existing users, so I listed it as a change.
- **Not in this release:**
  - CSV output was added and then reverted, so it is not available.
  - The crash on empty input is not fixed.

**Empty-input crash:** the "fix: crash on empty input" commit only adds a comment saying empty input is handled upstream. The code still calls `text.match(...)`, which returns null on empty text, so it will still throw. I left it out of "fixed" for that reason. You may want to fix the code or drop the commit before you ship.

**Version number:** you didn't give me the new version number, so it isn't named. The checker only allows a version on the range line.

**Flag name:** the checker doesn't allow code identifiers, so the notes don't name the `--json` flag. Users will have to find it in the help text or docs.