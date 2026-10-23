I fixed the regex in `src/validate.js` by adding `+` to the allowed local-part characters, so `user@example.com` now passes. I also added a test for plus addressing in `test/validate.test.js`. All 7 tests pass.

The rule that the local part must contain a letter is unchanged, so `user@example.com` is still rejected.

I haven't committed anything.