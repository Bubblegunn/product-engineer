The email regex in `src/validate.js` now accepts `+` in the part before the `@`, so addresses like `user@example.com` pass. I added a test for that case in `test/validate.test.js`. All 7 tests pass, including the existing ones.

I left the rule that rejects all-numeric local parts such as `user@example.com` as it was, because an existing test requires it. I haven't committed anything.