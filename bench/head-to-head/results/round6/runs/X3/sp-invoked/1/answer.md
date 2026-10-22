I've written `RELEASE_NOTES.md`. I checked it against the actual diff from v1.2.0 to HEAD, and the 3 tests pass.

**Two things in the commit log don't match the code:**
- **The empty-input crash is not fixed.** `7940f22 fix: crash on empty input` only added a comment in `src/count.js`. I ran `run([], '')` and it still throws `Cannot read properties of null (reading 'filter')`. I left it out of the notes, and "Fixed" says there are no user-facing fixes. You could fix it before shipping (about 1 line: `(text.match(/\S+/g) || [])`) or ship it as is.
- **`cf889a6 chore: tidy option defaults` changes behavior.** The default `minLength` went from 1 to 3, so `a to the fox` now counts 2 words instead of 4. I listed this under "Changed". If it wasn't intended, revert it before release.

**Smaller points:**
- `--csv` was added and then reverted, so it isn't in the notes.
- The notes have no version number, because you didn't give one. `package.json` still says 1.2.0. A new flag plus a default change suggests 1.3.0 rather than a patch release, but that's your call.
- I haven't tagged, pushed or committed anything.