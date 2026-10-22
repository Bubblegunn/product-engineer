`RELEASE_NOTES.md` is written, with one new feature and one changed default. I did not tag or push, and I did not run the tests.

- **New:** the `--json` flag.
- **Changed:** the default minimum word length is now 3, where it was 1. The commit message calls this "tidy option defaults", but it changes counts for existing users. I listed it under Changed so people see it.
- **Left out:** `--csv` was added and then reverted, so it isn't in the notes.

**Fixed section:** I left it out on purpose. The commit `fix: crash on empty input` only adds a code comment. `countWords` still calls `text.match(/\S+/g).filter(...)`, and `match` returns `null` on empty text, so empty input should still crash. The `--json` path in `src/cli.js` has no empty-input check either. I couldn't find any handling "upstream" as the comment claims. I didn't run it to confirm.

Decide before you ship:
- Do you want to fix the empty-input crash first? I can do that.
- Or keep the release as is and accept that the fix isn't real?

I didn't pick a version number for the notes. Add it to the heading when you tag.