I saved the release notes to `RELEASE_NOTES.md`. They cover the 8 commits since v1.4.0 (now version 1.4.1), written for hotel owners with no commit hashes. I didn't run any builds or tests, because the skill allows read-only git inspection only.

The notes list four changes:
- **Safer CSV exports:** entries that start with `=`, `+`, `-` or `@` no longer run as formulas when the file is opened in a spreadsheet.
- **Reminders:** guests with cancelled bookings no longer get the day-before email.
- **Stay totals:** totals are rounded to two decimal places.
- **Bookings list:** it now loads 50 bookings per page.

I left out the bulk cancel button. It was added and then reverted within the same range, so owners never get it in this release.

`README.md` still has a "Bulk cancel" section from the docs commit, even though the feature was reverted. I didn't touch it. You'll probably want to remove it.

I also didn't mention the internal `round2` refactor.

The pagination commit only changes `listBookings`, which takes a `page` argument. I didn't check whether the bookings page has any next/previous controls, so "50 per page" is the only claim I made.