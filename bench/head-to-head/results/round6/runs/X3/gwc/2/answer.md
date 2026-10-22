I wrote `RELEASE_NOTES.md`. I didn't tag or push. Two commits don't match their messages, so please check them before you ship.

- **`cf889a6` "chore: tidy option defaults" changes behavior.** It changes the default `minLength` from 1 to 3. Counts will drop for any text with 1–2 character words. I listed it under "Changed" with the `--min-length 1` workaround. If this was a mistake, revert it before release. A major or minor version bump may also fit better than a patch.
- **`7940f22` "fix: crash on empty input" doesn't fix the crash.** It only adds a comment. `text.match(/\S+/g)` still returns `null` on empty input, so `countWords("")` still throws. I left the fix out of the notes. A real fix would be `(text.match(/\S+/g) || [])`.
- **Left out of the notes:** `--csv` was added and then reverted, so it isn't in HEAD.
- **Version number:** I titled the notes v1.2.1 and didn't touch `package.json`, which still says 1.2.0. Change the title if you want a different number.