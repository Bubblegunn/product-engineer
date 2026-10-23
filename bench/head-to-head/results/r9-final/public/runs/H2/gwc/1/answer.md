I fixed the email regex in `src/validate.js`: the local part now accepts `+`, so addresses like `user@example.com` pass. I also added a test for that case in `test/validate.test.js`. The full suite passes (7 tests).

I left the rest of the regex alone, including the existing rule that rejects a local part with no letters (`user@example.com`). I haven't committed anything.