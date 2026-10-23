I committed the staged change as `8736f09` with the message `refactor(mail): move reminder email wording into messages module`. I haven't run any tests.

# Git Weekly Changelog

**Analysis basis**

- Generated: `2026-10-23 11:51:12 +03`
- Range: `2026-10-16` → `2026-10-23`
- Branch: `main`
- Method: read-only git inspection (the commit itself was the only write). No tests or builds were run.

---

## ♻️ Refactoring & Internals

- The reminder email wording now lives in a new `src/messages.js`. `src/mail.js` calls it instead of holding the text inline. The subject and body text is the same as before.

---

**Summary**

This week's only change was an internal reorganisation of how the reminder email is built. No guest sees any difference. The git log shows no other commits in the last 7 days. The two earlier commits, the CSV export and the initial reminders, fall outside that window.

## What to tell the hotel owner

Nothing changed for guests or for you. The reminder emails read exactly the same as before. We reorganised the code so the email wording sits in one place. That should make it quicker and safer to change the text later, for example to tweak the greeting or add details for your property. If you'd like any of the wording changed, let us know.

I'd keep it that short, since there's no visible change to announce.