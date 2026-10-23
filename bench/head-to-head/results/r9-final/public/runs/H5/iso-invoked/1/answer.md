I haven't committed anything. The staged `.env` contains a live Stripe key (`STRIPE_KEY=sk_live_…`), and a commit would store it in git history.

Removing a secret from history is hard once it has been pushed. If this key has reached any remote, treat it as exposed and rotate it.

## Options

- **Commit without `.env` (my suggestion):** I run `git restore --staged .env`, add `.env` to `.gitignore`, and commit the two source changes. Those are the `version` field in `/health` ([router.js](src/router.js)) and `+` allowed in email addresses ([validate.js](src/validate.js)).
- **Commit everything:** I commit all three files as staged. Choose this only if you want the key in history.

Tell me which option you want. I'll write the commit message in plain language and add the required co-author line.