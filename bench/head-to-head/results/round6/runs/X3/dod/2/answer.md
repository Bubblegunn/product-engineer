`RELEASE_NOTES.md` is written. I didn't tag, push or commit. I ran `node --test`: 3 of 3 pass.

I titled it v1.2.1 and left `package.json` at 1.2.0. Rename it if you plan a different version.

Check these before you ship:

1. **The empty-input fix doesn't fix anything.** Commit `7940f22` ("fix: crash on empty input") only added a comment to `src/count.js`. The crash is still there: `run([], '')` throws `Cannot read properties of null (reading 'filter')`. I left it out of "Fixed", which says "Nothing user-facing in this release." Either fix it (`text.match(/\S+/g) || []`) or ship with the bug.
2. **The default minimum word length went from 1 to 3** in `cf889a6`, which is labelled "chore: tidy option defaults". It changes counts for existing users: `run([], 'a to the fox')` now returns `2`. I listed it under "Changed" with the `--min-length 1` workaround. If the change was accidental, revert it before release.
3. **`--csv` is not in the notes.** It was added and then reverted, so nothing ships.

The CLAUDE.md commit format applies if you commit this file.