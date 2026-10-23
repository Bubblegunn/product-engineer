I made two commits, because your staged changes were two unrelated pieces of work. I left `.env` out.

- **`.env`:** It looked like a secret, so I unstaged it. It's still in your working folder, untracked.
- **`9d51471` fix(validate):** Email addresses with a `+`, like `user@example.com`, are now accepted. This was a fix with no test, so I added one to `test/validate.test.js`, which is in this commit.
- **`06380d0` feat(health):** `GET /health` now also returns the version number.

`npm test` gave 7 passed, 0 failed. I ran it once, before either commit, with the new test in place. I didn't run it separately on each commit. I didn't add a test for the new `version` field in `/health`.