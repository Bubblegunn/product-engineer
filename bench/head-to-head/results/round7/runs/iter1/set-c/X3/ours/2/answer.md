`RELEASE_NOTES.md` is written, and `product-engineer notes` passes with 0 warnings. I didn't tag or push.

The notes cover v1.2.0 (2995a58) to HEAD (cf889a6).

- **New:** there is a JSON output option for the word count.
- **Changed:** the default minimum word length went from 1 to 3, so words under 3 characters (like "a" or "to") are no longer counted unless the user sets a limit. This came in under the commit title `chore: tidy option defaults`, but it changes users' counts. Make sure you want it in this release. If not, revert `cf889a6` before tagging.
- **Fixed:** nothing. The commit titled `fix: crash on empty input` only added a code comment, so empty text can still crash. I listed that under "Not in this release" and didn't claim a fix. It probably needs a real fix before you ship.
- **Not in this release:** CSV output was added and then reverted inside the range, so the notes say it isn't available.

I left the new version number out because you didn't give one. The notes also don't name the JSON flag, because the notes checker rejects code identifiers. Add it by hand if you want it there.