`RELEASE_NOTES.md` is written. I didn't tag, push or commit. I titled it v1.3.0 because the default behavior changed; rename it if you want a different number.

Two commits don't match their messages:

- **`7940f22` "fix: crash on empty input" fixes nothing.** It only adds a comment to `src/count.js`. I ran `run([], '')` and it still throws `Cannot read properties of null (reading 'filter')`, because `''.match(/\S+/g)` returns `null`. I left it out of "Fixed", which says "Nothing in this release." If you want the fix in today's release, it's a one-line change (`(text.match(/\S+/g) || [])`).
- **`cf889a6` "chore: tidy option defaults" changes behavior.** It moved the default `minLength` from 1 to 3, so `a to the fox` now counts 2 words, not 4. I listed it under "Changed" with the `--min-length 1` workaround. If the change was accidental, revert it before shipping and drop that section.

I left out `--csv`, since it was added and then reverted. The existing tests don't cover either the empty-input crash or the `minLength` change.