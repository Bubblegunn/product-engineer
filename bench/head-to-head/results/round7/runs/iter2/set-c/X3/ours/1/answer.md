`RELEASE_NOTES.md` is written, and `product-engineer notes` passes on it. I did not tag or push. The range is v1.2.0 to HEAD, commit 2995a58 to cf889a6, and the notes don't name the new version.

Two of the commit messages don't match what the code does, so check these before you ship:

- **The empty-input fix isn't a fix.** "fix: crash on empty input" only adds a comment. I ran the CLI with empty text at HEAD and it still throws `TypeError: Cannot read properties of null`. I put this under "Not in this release" rather than claim it's fixed. If you want it fixed today, the word-matching step needs to handle the case where there are no words.
- **"chore: tidy option defaults" changes behavior.** The default minimum word length goes from 1 to 3, so the default count drops for text with short words like "a" or "to". I listed it as a change, with how to get the old behavior back. If that wasn't intended, revert that commit before tagging.

What the notes say:

- **New:** JSON output.
- **Changed:** the default minimum word length.
- **Not in this release:** CSV output, which was added and then reverted, and the empty-input crash.

The notes follow the release-notes skill's rules, so they leave out code names and flag names. That means they describe JSON output and the minimum-length setting in words and don't give the flag spellings.