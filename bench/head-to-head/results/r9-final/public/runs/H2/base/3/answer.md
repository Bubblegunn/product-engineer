I fixed the regex in `src/validate.js`. It now allows `+` in the part before the `@`, so `user@example.com` is accepted. I added no new test for a `+` address; I checked it with a one-off call. The existing tests pass (6 of 6).

`user@example.com` and `no-at-sign` are still rejected, as the existing tests expect.