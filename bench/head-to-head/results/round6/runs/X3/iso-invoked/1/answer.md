`RELEASE_NOTES.md` is written in the repo root. I haven't tagged, pushed or committed anything.

Two commits didn't do what their messages say, so I wrote the notes from the code diff instead:

- **`fix: crash on empty input` fixes nothing.** It only adds a comment. Empty text still throws `TypeError: Cannot read properties of null` (I ran it). The notes say "Fixed: nothing in this release" and list the crash under Known issues. If you add a fix before shipping, move that line to Fixed.
- **`chore: tidy option defaults` changes behavior.** The default `minLength` went from 1 to 3, so short words like "a" and "to" no longer count by default. The notes list this under Changed, with the `--min-length 1` workaround. You may want to treat it as a breaking change and decide on the version number.

Other contents:

- **New:** the `--json` flag.
- **Left out:** `--csv`, because it was added and then reverted, so it is not in the release.
- **Version:** `package.json` still says `1.2.0`. I didn't change it.