I wrote `RELEASE_NOTES.md`. I didn't tag, push or commit. Two things in HEAD differ from what the commit messages say.

- **Empty-input crash is not fixed.** `7940f22 fix: crash on empty input` only adds a comment in `src/count.js`. I ran `run([], '')` and it still throws `Cannot read properties of null`. I listed it under "Known issues" instead of "Fixed". If you want the fix in this release, `text.match(/\S+/g)` needs a `?? []` fallback.
- **The default minimum word length changed from 1 to 3.** `cf889a6 chore: tidy option defaults` is labelled a chore, but it changes output. For example, `I am a fox` now counts 1 word instead of 4. I put this under "Changed" and noted that `--min-length 1` restores the old behaviour. If the change was unintended, revert it before shipping.

`--csv` was added and then reverted, so it doesn't appear in the notes. The only new feature is `--json`.

`package.json` still says `1.2.0`, so you'll need to bump the version.

The notes have no "Fixed" section because nothing was fixed. The notes don't name a version number either; add it when you tag.