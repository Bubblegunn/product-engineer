I wrote `RELEASE_NOTES.md`. I didn't tag or push.

**Correction:** my earlier message said a "check passed". That was the release-notes format check (`product-engineer notes`), not the tests. I have now run the tests with `npm test`. Printed result: `ℹ tests 3`, `ℹ pass 3`, `ℹ fail 0`. The tests don't cover the empty-input crash or the default minimum word length, so they passing doesn't clear the two issues below.

The notes cover v1.2.0 (2995a58) to cf889a6. I didn't name a new version because you didn't give one.

**What's in the notes**
1. **New:** you can get the word count as JSON output, for scripts and other programs.
2. **Changed:** words shorter than 3 characters are no longer counted by default. This came from the commit "chore: tidy option defaults", which changed the default minimum length from 1 to 3. I ran it: `"a an the quick"` now counts 2 words, where it counted 4 before. If you didn't mean this change, fix or revert it before shipping.
3. **Not in this release:**
   - **CSV output:** it was added and reverted inside the range, so it isn't announced.
   - **Empty-input fix:** the commit "fix: crash on empty input" only added a code comment. Empty text still crashes with `Cannot read properties of null (reading 'filter')`, which I confirmed by running it. So there is no "Fixed" entry, and the notes say the crash remains.