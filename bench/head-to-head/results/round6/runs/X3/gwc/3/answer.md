`RELEASE_NOTES.md` is written. I didn't tag, push, or commit. I haven't run `node --test`.

Three things in the commit history don't match their messages:

- **Empty-input crash is not fixed.** `7940f22 fix: crash on empty input` only adds a comment. `run([], '')` still throws `Cannot read properties of null (reading 'filter')`. I left it out of "Fixed", and the notes say there are no fixes in this release. If you want to ship the fix, `countWords` needs a guard such as `(text.match(/\S+/g) || [])`.
- **The default minimum word length changed.** `cf889a6 chore: tidy option defaults` changes `minLength` from 1 to 3. By default, words under 3 characters like "a" and "of" are no longer counted, so `a of the fox` now gives 2. I listed this under "Changed" and said how to get the old behavior (`--min-length 1`). If it wasn't intended, revert that line before release.
- **`--csv` is not in the notes.** It was added and then reverted, so it has no net effect.

I titled the notes `v1.3.0` because there's a new feature and a behavior change. `package.json` still says `1.2.0`. Change the version number or bump `package.json` if you want a different one.