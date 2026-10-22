I wrote `RELEASE_NOTES.md` and it passes `product-engineer notes`. I didn't tag or push.

The notes cover v1.2.0 to HEAD, which is 5 commits (cbe13e2 to cf889a6). Two commits don't do what their titles say, so check these before you ship:

- **"fix: crash on empty input" fixes nothing.** It only adds a comment to `src/count.js`. Empty text still crashes, because `text.match(...)` returns null. I put this under "Not in this release" and did not list it as a fix. If you want it fixed today, it needs a real code change.
- **"chore: tidy option defaults" changes behavior.** It changes the default `minLength` from 1 to 3, so words shorter than 3 characters are no longer counted by default. Counts for the same text can drop compared with v1.2.0. I listed it as a change. If the new default wasn't intended, revert that commit before releasing.

The other entries:

- **`--json` flag:** listed as new.
- **`--csv`:** added and then reverted inside the range, so the notes say it isn't available.

I left the new version number out of the notes because you didn't give me one.