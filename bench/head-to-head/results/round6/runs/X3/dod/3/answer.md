I wrote `RELEASE_NOTES.md`. Two things in HEAD need your attention before you tag.

1. **The "fix: crash on empty input" commit (7940f22) fixes nothing.** It only adds a comment to `src/count.js`. I ran `run([], '')` on HEAD and it still throws `Cannot read properties of null (reading 'filter')`. So I left it out of "Fixed", which says "Nothing user-facing in this release". If you want that fix in 1.3.0, the code needs a real change first, such as `(text.match(/\S+/g) || [])`.

2. **"chore: tidy option defaults" (cf889a6) is a behavior change.** It changes the default `minLength` from 1 to 3, so `a bc def` now counts 1 word instead of 3. I listed it under "Changed" because users will see different counts. If it wasn't intentional, revert it before shipping.

I left out `--csv`. It was added and then reverted, so it isn't in HEAD.

I titled the notes "1.3.0" because there's a new flag, and the default change could argue for a major bump. `package.json` still says 1.2.0. Change the title and bump `package.json` to whatever version you want.

I didn't run the test suite, and I didn't tag or push.