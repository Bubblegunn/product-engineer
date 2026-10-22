`RELEASE_NOTES.md` is written. I did not tag or push. It has two sections: "What's new" and "Changed". There is no "Fixed" section, for the reason in the first point below.

Two commits don't match their messages, so check them before you ship:

- **`7940f22 fix: crash on empty input` does not fix the crash.** It only adds a comment to `src/count.js`. `text.match(/\S+/g)` still returns `null` on empty input, so `.filter` still throws. I left the fix out of the notes. If you want it, the fix is `(text.match(/\S+/g) || [])`. Tell me and I'll apply it and add a test.
- **`cf889a6 chore: tidy option defaults` changes behavior.** The default `minLength` went from 1 to 3, so words with 1 or 2 characters ("a", "to") are no longer counted by default. This is a user-visible change, not a tidy-up. I listed it under "Changed". If it was a mistake, revert it before release.

I left `--csv` out of the notes. It was added and then reverted, so it isn't in HEAD.

I titled the notes "v1.2.1". Rename the heading if you want a different version number. `package.json` still says 1.2.0, and I didn't change it.