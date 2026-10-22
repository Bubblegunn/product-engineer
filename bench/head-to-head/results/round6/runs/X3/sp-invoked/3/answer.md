I wrote `RELEASE_NOTES.md`, but two commits since v1.2.0 don't do what their messages say. Please look at both before you tag. I didn't tag or push.

`npm test` passes (3 of 3). I also ran the code by hand to check the two commits below.

- **"fix: crash on empty input" doesn't fix the crash.** It only adds a comment to `src/count.js`. Running `run([], '')` still throws `Cannot read properties of null (reading 'filter')`. I left "Fixed" out of the notes. If you ship this as is, the crash remains. The fix is a one-line guard such as `(text.match(/\S+/g) || [])`. I haven't made that change.
- **"chore: tidy option defaults" changes behavior.** It changed the default `minLength` from 1 to 3. `a to the fox` now counts 2 words, where v1.2.0 counted 4. That is a visible change for users, not a tidy-up. I listed it under "Changed". If it was a mistake, revert it instead.
- **`--csv` is not in the notes.** It was added and then reverted, so it has no net effect.

The notes contain one new item, the `--json` flag, and one change, the new default minimum word length. I titled the file "v1.2.1 (draft)" because there's a behavior change but no new feature beyond `--json`. Rename it if you want 1.3.0 or another number.