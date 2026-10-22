`RELEASE_NOTES.md` is written. I didn't tag or push. It has two items, and two commits changed less than their messages say.

- **New:** `--json` flag prints `{"words":4}`.
- **Changed:** the default minimum word length went from 1 to 3. This came in under `chore: tidy option defaults`, so it's easy to miss. `a an the quick` now counts 2 words instead of 4, so the notes say to pass `--min-length 1` for the old behavior. If the change wasn't intended, revert it in `src/count.js` before you ship.
- **Left out, the empty-input fix:** `fix: crash on empty input` only added a comment. Empty text still throws `Cannot read properties of null (reading 'filter')`. I ran it to check, so the notes don't list a fix. The release still has the crash.
- **Left out, `--csv`:** it was added and reverted, so it has no net effect.

I also gave the notes a placeholder heading, `tally next release (after v1.2.0)`. `package.json` still says 1.2.0, so change the heading to the new version number and bump `package.json` when you tag.