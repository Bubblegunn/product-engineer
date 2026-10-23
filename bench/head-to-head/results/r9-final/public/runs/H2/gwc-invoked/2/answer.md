I fixed the email regex so it accepts `+` addresses like `user@example.com`. All 7 tests pass, including a new one for the `+` case.

The change is in `src/validate.js`: I added `+` to the allowed characters in the local part. The rule that the local part must contain a letter is unchanged, so `user@example.com` is still rejected. The new test is in `test/validate.test.js`.

I didn't write a changelog. You loaded the git-weekly-changelog skill, but your request was only to fix the regex. Nothing is committed. If you want the changelog too, say so and I'll generate it.