`RELEASE_NOTES.md` is written, and the notes checker passes. I didn't tag, push or commit.

Two of the commits since v1.2.0 don't do what their titles say:
- **"fix: crash on empty input" fixes nothing.** It only adds a comment. I ran `countWords('')` and it still throws. I left it out of "fixed" and listed it under "Not in this release". If you want it fixed before shipping, it is a one-line change.
- **"chore: tidy option defaults" changes behavior.** The default minimum word length goes from 1 to 3, so `a bb ccc dddd` now counts 2 words instead of 4. I listed it as a change, with how to get the old behavior. If that wasn't intended, revert it before release.

The notes cover:
- **New:** the `--json` output.
- **Changed:** the default minimum word length.
- **Not in this release:** `--csv`, which was added and then reverted, and the empty-input crash fix.

I didn't write a version number, since you didn't give one. The first line names the range as v1.2.0, commit cbe13e2 to cf889a6.