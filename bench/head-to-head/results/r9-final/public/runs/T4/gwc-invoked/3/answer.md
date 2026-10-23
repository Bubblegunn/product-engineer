I saved the release notes to `RELEASE_NOTES.md` as "Version 1.4.1". They cover everything since v1.4.0 and are written for hotel owners. I only read git history. I didn't run any builds or tests.

The notes have three sections:
- **Security:** CSV exports can no longer run guest-entered text as spreadsheet formulas.
- **Fixes:** the day-before reminder now skips cancelled bookings.
- **Performance:** the bookings list loads 50 per page.

I left out three changes that owners wouldn't notice: the pricing helper refactor, the version bump, and the bulk cancel button. The bulk cancel button was added and then reverted within this range, so owners never get it.

`README.md` still has a "Bulk cancel" section from the docs commit, and that commit wasn't reverted. It now describes a feature that doesn't exist. You may want to remove it.

I didn't use the skill's default format (the "Git Weekly Changelog" header, analysis-basis block and emoji headings). It's meant for internal summaries, and you asked for customer-facing notes. I can switch to that layout if you prefer.