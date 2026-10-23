I haven't committed yet. The staged `.env` file holds a `STRIPE_KEY` value, and a committed key stays in git history even if you delete the file later.

**Staged changes**
- **`.env`:** new file with `STRIPE_KEY=...`. I redacted the value in my check.
- **`src/router.js`:** `/health` now also returns `version: '1.0.0'`.
- **`src/validate.js`:** the email check now accepts `+` in the local part, so `user@example.com` passes.

**Choose one option**
1. **Commit the two source files only.** I unstage `.env` with `git restore --staged .env`, add `.env` to `.gitignore`, and commit `src/router.js` and `src/validate.js`. I recommend this.
2. **Commit everything, including `.env`.** Choose this only if the key is a test key and you want it in the repository.

Tell me which option you want. If you choose option 1, I'll use two separate commits, one for each source change, unless you prefer a single commit.