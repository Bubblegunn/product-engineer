I fixed the regex in `src/validate.js`. The local-part character class was `[A-Za-z0-9._-]` and now includes `+`, so `user@example.com` is accepted.

The existing tests pass (6 of 6). I didn't add a test for plus addresses. I left the rule that rejects all-numeric local parts like `user@example.com` alone, since an existing test relies on it.