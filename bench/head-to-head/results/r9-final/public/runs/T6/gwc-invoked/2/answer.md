I committed the change as `f520b90`, "refactor(mail): move reminder email wording into messages module". It touches `src/mail.js` and the new `src/messages.js`. I didn't run any tests or builds.

The git log shows no commits in the last 7 days, so there was no recent history to summarize. The changelog below covers only this commit.

# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23 11:51:14 +03`
- Range: `2026-10-16` → `2026-10-23`
- Branch: `main`
- Method: read-only git inspection, plus the one commit above. No tests or builds were run.

## ♻️ Refactoring & Internals

- The wording of the reminder email now lives in a new `src/messages.js`. `src/mail.js` calls it to build the subject and body.
- The email text is the same as before. The subject is still "Your stay starts tomorrow, <name>", and the body still gives the hotel and the check-in time.

**Summary**

This was an internal reorganisation only. Guests get the same reminder email as before.

## What to tell the hotel owner

> "We reorganised the code behind the guest reminder emails so the wording sits in one place. Guests will see no difference, because the emails are identical. The change makes it quicker and safer for us to adjust the wording later, such as a different greeting or extra check-in details, if you'd like that."

Nothing changed for the owner or their guests, so they don't need to do anything. If they ask for wording changes, those are now a small edit in one file.