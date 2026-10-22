I wrote `RELEASE_NOTES.md` with a "What's new" and a "Changed" section. There is no "Fixed" section, because nothing in this release fixes a bug. I didn't tag, push, or commit.

- **New:** `--json` output flag.
- **Changed:** `countWords` now defaults `minLength` to 3, where v1.2.0 used 1. Words of 1–2 characters, like "a" or "to", stop being counted. The commit calls this a "chore: tidy option defaults", but it changes counts for existing users, so I listed it under "Changed". Check that you meant it. If not, revert `cf889a6` before shipping.
- **Left out:** `--csv`. It was added and then reverted, so users never see it.
- **Not a fix:** `7940f22` ("fix: crash on empty input") only adds a comment to `src/count.js`. `text.match(/\S+/g)` returns `null` on empty text, so `countWords("")` still throws. I left it out of the notes. If you want that fix in today's release, it needs a real code change.
- **Version:** `package.json` still says 1.2.0. I titled the notes "tally next release" because I don't know the version number. Bump `package.json` and update the title when you tag.