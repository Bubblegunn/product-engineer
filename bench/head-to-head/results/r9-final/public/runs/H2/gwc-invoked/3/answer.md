I fixed the email validation regex in `src/validate.js`: the local part now accepts `+`, so addresses like `user@example.com` pass.

I checked it with a quick call to `isValidEmail`. `user@example.com` and `user@example.com` return true. `user@example.com` and `no-at-sign` still return false. I didn't run the test suite, and I didn't add a test for the `+` case. I haven't committed anything.

**Changelog:** the git-weekly-changelog skill only produces a summary of recent history, so it didn't help with the fix itself. I ran its history check, and `git log` shows no commits on `main` in the last 7 days (as of 2026-10-23 11:57 +03). The two existing commits are older, so I didn't write a changelog. If you want one over a longer range, tell me the window.