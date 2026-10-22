`RELEASE_NOTES.md` is written. I did not tag or push.

Three things in the history affected what I wrote:

- **Empty-input crash is not fixed.** The commit `fix: crash on empty input` only adds a comment to `src/count.js`. `text.match(/\S+/g)` still returns `null` on empty text, so `.filter` still throws. I listed "Nothing to report" under Fixed. Either fix it before release, or ship as is. Don't claim it fixed.
- **Hidden default change.** The commit `chore: tidy option defaults` changed `minLength` from 1 to 3. This changes output for existing users, because words shorter than 3 characters are no longer counted. I listed it under Changed with the `--min-length 1` workaround. If the change was a mistake, revert it instead.
- **`--csv` left out.** It was added and then reverted inside this range, so users never see it.

I titled the notes "v1.2.1" because the only new feature is `--json`. If you want a minor bump, change it to v1.3.0.