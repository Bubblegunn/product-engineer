I wrote `RELEASE_NOTES.md`. I haven't tagged, pushed or committed anything. Two things in the commit history don't match their messages, so check them before you ship.

**What the notes say**
- **New:** the `--json` flag.
- **Changed:** the default minimum word length went from 1 to 3. This is a user-visible change. `cf889a6 chore: tidy option defaults` flipped `minLength = 1` to `3` in `src/count.js`, so counts for the same input can drop.
- **Fixed:** nothing. I left the section out on purpose.

**Problems**
1. **The empty-input crash is not fixed.** `7940f22 fix: crash on empty input` only added a comment. I ran `run([], '')` on HEAD and it still throws `Cannot read properties of null (reading 'filter')`. The cause is that `text.match(/\S+/g)` returns `null` on empty text. The commit message and the comment ("handled upstream") are wrong. If you want the fix in this release, the code needs `(text.match(/\S+/g) || [])`, plus a test.
2. **The default change may be accidental.** If it was meant as a tidy-up with no behavior change, revert that line before release. If it's intended, the "Changed" note stands as written.

**Smaller points**
- `--csv` was added and then reverted, so it's not in the notes.
- `package.json` still says `1.2.0`. I titled the notes "v1.2.1" because there is a behavior change and no breaking removal. Change that if you want 1.3.0, since the new flag is a feature. Bump `package.json` to match.
- `npm test` passes (3 of 3). No test covers empty input or the new default.

Do you want me to fix the empty-input crash, revert the default, or both?