`RELEASE_NOTES.md` is written. I did not tag, push or commit.

- **New:** the `--json` flag. `--csv` was added and then reverted inside this range, so it is not in the notes.
- **Changed:** the default `--min-length` went from 1 to 3 in the "tidy option defaults" commit. Words of 1–2 characters are no longer counted by default. I ran it: `a to the fox` gives 2, where v1.2.0 gave 4. This changes users' counts, so I listed it as a change even though the commit is labelled `chore`. If it was not intended, revert it before shipping.
- **Fixed:** nothing. The "crash on empty input" commit only added a comment. Empty input still throws `Cannot read properties of null (reading 'filter')`. I did not claim a fix. The cause is `text.match(/\S+/g)` returning `null` on empty text.

I titled the notes v1.3.0 because there is a new feature and a behavior change. Change the heading if you want a different version. `package.json` still says 1.2.0.