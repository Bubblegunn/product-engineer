`RELEASE_NOTES.md` is written. I didn't tag, push or commit.

Two things in the history don't match the commit messages:

- **Empty-input crash is not fixed.** Commit `7940f22` ("fix: crash on empty input") only adds a comment in `src/count.js`. I ran `run([], '')` and it still throws `Cannot read properties of null (reading 'filter')`. I left it out of the notes. The fix would be `(text.match(/\S+/g) || [])`. Tell me if you want it before you ship.
- **`cf889a6` ("chore: tidy option defaults") changes behavior.** The default `minLength` went from 1 to 3, so words under 3 characters are no longer counted. I listed this under "Changed" with the `--min-length 1` workaround. If it wasn't intended, revert it before the release.

Other notes:

- The `--csv` commit and its revert cancel out, so neither is in the notes.
- I titled the file "v1.2.1" because `package.json` still says 1.2.0 and I didn't bump it. The default-length change could justify 1.3.0 instead. Pick the version when you tag.