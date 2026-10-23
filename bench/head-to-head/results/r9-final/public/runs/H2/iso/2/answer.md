I fixed the regex in `src/validate.js`. The local part now allows `+`, so `user@example.com` passes. All 7 tests pass, including a new one for plus addresses in `test/validate.test.js`.

I left the existing rule that rejects an all-numeric local part (`user@example.com`) as it was, since a test covers it. I haven't committed anything.