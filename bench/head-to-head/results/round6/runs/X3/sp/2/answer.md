`RELEASE_NOTES.md` is written. I didn't tag, commit or push. Two things in it need your attention before you ship.

- **Empty-input crash is not fixed.** Commit `7940f22` ("fix: crash on empty input") only adds a comment in `src/count.js`. I ran `run([], '')` on HEAD and it still throws `Cannot read properties of null (reading 'filter')`. So I left it out of "Fixed". If you want it fixed, `countWords` needs to handle a `null` result from `text.match(...)`.
- **Default minimum word length changed.** Commit `cf889a6` ("chore: tidy option defaults") changed `minLength` from 1 to 3. On HEAD, `'a an the fox'` counts 2 words, where v1.2.0 counted 4. This is a visible behavior change, so I listed it under "Changed". Check that it's intended. If not, revert it before release.

`--csv` is not in the notes. It was added and then reverted, so it isn't in HEAD.

I titled the notes "v1.2.1" because the only new feature is `--json`. If you want a minor bump to 1.3.0, change the heading. `package.json` still says 1.2.0, so you'll need to bump it too.