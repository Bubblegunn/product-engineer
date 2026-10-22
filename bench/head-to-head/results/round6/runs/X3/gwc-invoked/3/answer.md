`RELEASE_NOTES.md` is written. I did not tag, push or commit, and I did not run tests. I used a "what's new / changed / fixed" layout instead of the skill's weekly-changelog template, because you asked for user-facing release notes. The range is v1.2.0..HEAD.

The notes contain:
- **New:** the `--json` flag, which prints `{"words":N}`.
- **Changed:** the default `--min-length` is now 3 instead of 1, so 1–2 character words are no longer counted by default.
- **Fixed:** nothing.

Three commits don't match their titles:
- **"fix: crash on empty input" fixes nothing.** It only adds a comment in `src/count.js`. `text.match(/\S+/g)` returns `null` on empty text, so `countWords('')` still throws. `src/cli.js` has no empty-input guard either, so the comment's claim that empty input is "handled upstream" looks wrong. I left this out of the notes because the bug is still there. You may want to fix it before shipping.
- **"chore: tidy option defaults" is a behavior change.** It changes the default `minLength` from 1 to 3, which alters counts for every user who doesn't pass `--min-length`. I listed it under "Changed" and said so plainly. If you didn't mean to change it, revert that commit.
- **`--csv` output** was added and then reverted, so it isn't in the notes.

I titled the file "v1.3.0" because of the new flag, but I assumed that number. The default change could count as breaking, so v2.0.0 is also defensible. Change the title if you want a different version.