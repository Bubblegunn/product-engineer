I wrote `RELEASE_NOTES.md`. I didn't tag, commit or push. Two things in the log don't match what the code does, so check them before you ship.

**1. The empty-input crash is not fixed.**
- The commit `fix: crash on empty input` only added a comment to `src/count.js`. It has no code change.
- I ran `run([], '')` and it still throws `Cannot read properties of null (reading 'filter')`.
- I left it out of the "Fixed" section because listing it would be false.
- You can fix it before release by changing `text.match(/\S+/g)` to `(text.match(/\S+/g) || [])`. Tell me if you want me to make that change and add a test.

**2. A "tidy" commit changed behavior.**
- `chore: tidy option defaults` changed the default `minLength` from 1 to 3.
- Words with 1 or 2 characters are no longer counted by default.
- I listed this under "Changed". If it wasn't intentional, revert it before release.

**What the notes say**
- **New:** the `--json` flag.
- **Changed:** the new default minimum word length.
- **Not mentioned:** `--csv` was added and then reverted, so it doesn't ship.

**Version and tests**
- I titled the notes v1.2.1 because the changes are small. `package.json` still says 1.2.0. Change the title to match whatever version you pick, and bump `package.json` if you want it to match.
- `npm test` passed 3 of 3 tests. None of them cover the empty-input case.