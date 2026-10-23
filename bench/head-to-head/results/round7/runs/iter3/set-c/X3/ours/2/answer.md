`RELEASE_NOTES.md` is written and passes the `product-engineer notes` check. I did not tag or push.

The notes cover v1.2.0 (commit 2995a58) to HEAD (cf889a6). They say:
- **New:** you can get the word count as JSON, for example `{"words":4}`.
- **Changed:** words shorter than 3 characters are no longer counted by default. "a to the fox" now gives 2, where it gave 4 before.
- **Not in this release:** CSV output, because it was added and then reverted inside the range.

Two things you should check before you ship:
1. **The empty-input "fix" doesn't fix anything.** Commit 7940f22 only adds a comment. I ran it, and empty text still throws `Cannot read properties of null`. I listed this under "Not in this release" instead of claiming a fix. If you want it fixed, the change is small, but I haven't made it.
2. **The default-length change is a behavior change, and it came from a commit titled "tidy option defaults."** It changes counts for existing users, so I put it under Changed with a workaround: set the minimum length to 1. If it was accidental, revert it before release and drop that line from the notes.

The notes don't name the new version, since you didn't give one.