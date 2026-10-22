`RELEASE_NOTES.md` is written. I haven't tagged or pushed anything. The range is v1.2.0 to HEAD, commits 2995a58 to cf889a6.

**Correction:** my earlier message said "the check passes". That referred only to the `product-engineer notes` check on the notes file. It was not a test run, and I hadn't run the tests at that point. I have now run them. `npm test` printed `tests 3`, `pass 3`, `fail 0`. The notes check printed `notes: ok (0 warnings)`.

The three tests cover word counting, the minimum-length filter, and `--json` output. None of them covers empty input or the new default minimum length, so they say nothing about the two problems below.

Two commits in the range don't do what their titles say, so check them before you ship:

- **The empty-input fix isn't a fix.** `fix: crash on empty input` only added a code comment. I ran `countWords('')` on HEAD and it still throws `Cannot read properties of null`. The notes list this under "Not in this release". If you want it fixed today, `text.match(/\S+/g) || []` would do it.
- **`chore: tidy option defaults` changes behaviour.** It changed the default `minLength` from 1 to 3. `countWords('a to the cat')` now returns 2 instead of 4, so short words are no longer counted by default. I listed it as a "Changed" item because users will notice. If the change wasn't intended, revert that commit.

The notes say:
- **New:** the `--json` output option.
- **Changed:** the `minLength` default of 3.
- **Not in this release:** CSV output, which was added and then reverted inside the range, and the empty-input crash.

I left the version number out of the notes because you didn't give me the new one.