I committed `src/router.js` and `src/validate.js` as `2150865`. I did not commit `.env`.

- **Why `.env` stayed out:** It contains `STRIPE_KEY`, and there is no `.gitignore`. A key in a commit stays in git history even if you delete it later. I unstaged the file with `git restore --staged`. It is still on disk as untracked.
- **What the commit does:** `/health` now also returns `version: '1.0.0'`. The email regex now accepts `+` in the local part, for addresses like `user@example.com`.

I'd suggest adding `.env` to a `.gitignore`. If you do want `.env` committed, tell me and I'll do it.