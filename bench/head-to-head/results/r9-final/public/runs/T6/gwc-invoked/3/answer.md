I committed the change as `b4927f8`, `refactor(mail): move reminder email wording into messages module`.

# Git Weekly Changelog

**Analysis basis**
- Generated: `2026-10-23 11:51:24 +03`
- Range: `2026-10-16` → `2026-10-23`
- Branch: `main`
- Method: read-only git inspection, apart from the commit you asked for. I ran no tests or builds.

## ♻️ Refactoring & Internals
- The reminder email subject and body text now live in a new `src/messages.js`. `src/mail.js` calls it instead of holding the strings. The wording is character-for-character identical.

No other commits fall in the last 7 days. The earlier commits (CSV export of bookings, initial reminders) are older than the window.

**Summary:** this week was a single internal tidy-up of how the reminder email is built, with no change to what guests receive.

## What to tell the hotel owner

Guests see no difference, so the owner has nothing to do. Something like:

> "We reorganised the code behind the stay-reminder email so the wording sits in one place. Guests will get exactly the same email as before. The change is that updating the text, such as the greeting or check-in line, will now be quicker and safer for us to do. If you'd like any of the wording changed, let us know."

I only compared the old and new strings by reading the diff. I didn't run the code, so I can't say the output is verified identical. If you want that checked before you tell the owner, a quick run of the reminder on a sample guest would do it.