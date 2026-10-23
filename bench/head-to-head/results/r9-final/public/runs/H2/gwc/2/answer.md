I fixed the regex in `src/validate.js`: the local-part character class now includes `+`, so addresses like `user@example.com` are accepted.

I added a test for plus addressing in `test/validate.test.js`. All 7 tests pass, including the existing rule that a purely numeric local part like `user@example.com` is rejected.

I haven't committed anything.