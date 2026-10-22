I wrote `RELEASE_NOTES.md`, and `product-engineer notes` passes on it. Nothing is tagged or pushed. Two of the commits don't do what their titles say, so check these before you ship:

- **"fix: crash on empty input" doesn't fix the crash.** It only adds a comment. I ran the code with empty text and it still throws `Cannot read properties of null (reading 'filter')`. I listed the crash under "Not in this release" instead of claiming a fix. If you want it fixed today, it needs a real code change.
- **"chore: tidy option defaults" changes behaviour.** The default minimum word length went from 1 to 3, so "a I of the fox" now counts 2 words, where v1.2.0 counted 5. I put it under "Changed", with `--min-length 1` as the way to get the old counts back. You may want to decide whether this should ship as 1.2.x or as a minor/major bump.

The notes also say:
- **New:** the `--json` option.
- **Not available:** CSV output was added and then reverted inside the range, so it is listed as not available.

The range line reads "v1.2.0 (commit 2995a58 to cf889a6)". I didn't name the new version, since you didn't give one.