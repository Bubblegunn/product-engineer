I wrote `RELEASE_NOTES.md`. Two things in the range need your attention before you ship.

**1. The "fix: crash on empty input" commit doesn't fix the crash.**
- It only adds a comment in `src/count.js`.
- I ran `run([], '')` on HEAD and it still throws `Cannot read properties of null (reading 'filter')`.
- I left the crash out of the "Fixed" section, so the notes have no Fixed section. Either fix it before release or tell me to list it as a known issue.

**2. The "chore: tidy option defaults" commit changes behavior.**
- It changes the default `minLength` from 1 to 3.
- `a to the fox` now counts 2 words instead of 4.
- I listed it under "Changed" with the `--min-length 1` workaround.
- If the change wasn't intended, revert that line instead.

**Other points:**
- **`--csv`:** I left it out because it was added and then reverted in this range.
- **Version number:** I titled the notes v1.2.1 because the changes are small. The default change could justify v1.3.0, so check the number. `package.json` still says 1.2.0, so you'll need to bump it.

I didn't commit, tag or push.