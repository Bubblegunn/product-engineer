I fixed the regex in `src/validate.js`. The local-part character class didn't include `+`, so I added it, and `user@example.com` now passes. The rest of the pattern is unchanged, so `user@example.com` is still rejected, as the existing test requires.

I also added a test for a `+` address in `test/validate.test.js`. `npm test` passes all 7 tests. I haven't committed anything.