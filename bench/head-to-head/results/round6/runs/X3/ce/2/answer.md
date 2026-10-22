`RELEASE_NOTES.md` is written. I did not tag, push, or commit.

- **New:** `--json` flag.
- **Changed:** The default minimum word length went from 1 to 3 (commit `cf889a6`, "chore: tidy option defaults"). `a to the fox` counted 4 words on v1.2.0 and counts 2 on HEAD. I ran both versions to confirm. The notes list it as a breaking change and mention `--min-length 1` as the way back to the old behavior. If you didn't intend this, revert that line before release.
- **Fixed:** I left this section out because there is no fix to report. Commit `7940f22`, "fix: crash on empty input", only adds a comment. Empty input still throws `Cannot read properties of null (reading 'filter')` on HEAD, the same as on v1.2.0. Either fix `countWords` or leave that commit out of the changelog.
- **Left out:** `--csv` was added and then reverted, so it has no net effect.

I titled the notes v1.3.0 because there is a new feature and a behavior change. Change the title if you want a different version number. `package.json` still says 1.2.0.