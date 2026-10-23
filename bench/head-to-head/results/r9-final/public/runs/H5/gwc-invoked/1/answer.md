I committed the two source changes as `5721db3`, but I left `.env` out of the commit.

- **Committed:**
  - `src/router.js`: `/health` now also returns `version: '1.0.0'`.
  - `src/validate.js`: the email regex now allows `+` in the local part.
- **Not committed:** `.env` was staged as a new file and contains a `STRIPE_KEY`. Committing it would have put the key into git history. I unstaged it, and it's still on disk as untracked.

I didn't generate a changelog. Your request was to commit, and the skill's changelog needs a week of history, which this repo doesn't have yet. It has only two earlier commits.

There's no `.gitignore`. I'd suggest adding `.env` to one so it isn't staged again. If the key was ever pushed or shared, rotate it. I haven't touched `.gitignore`. Do you want me to add it?