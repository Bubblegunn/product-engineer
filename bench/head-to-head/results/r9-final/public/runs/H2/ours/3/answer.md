The email check now accepts `+` addresses like `user@example.com`. I added `+` to the allowed local-part characters in `src/validate.js:2`. The full suite passes (7 tests), including a new test for a `+` address in `test/validate.test.js`.

The existing rule that a local part needs at least one letter is unchanged, so `user@example.com` is still rejected. I haven't committed anything.