`RELEASE_NOTES.md` is written. I did not tag, push, or commit.

Two things in the history differ from what the commit messages say:

- **Default word length changed.** `chore: tidy option defaults` changed the default `minLength` from 1 to 3. That changes output: `a bb ccc dddd` now counts 2 words, not 4. I listed it under **Changed** and told users to pass `--min-length 1` for the old behavior. Check that you want this to ship. If it was a mistake, revert `cf889a6` and the entry goes away.
- **The empty-input crash is not fixed.** `fix: crash on empty input` only added a comment to `src/count.js`. `run([], '')` still throws `Cannot read properties of null (reading 'filter')`. I left it out of the notes and wrote "Nothing to report" under **Fixed**. If you want it fixed before release, it needs a real guard in `countWords`. I can add one.

`--csv` is not mentioned because the revert cancels it out. The only new feature is `--json`.

The notes use the heading "tally next release" because I don't know the version. Change it to the version you tag.