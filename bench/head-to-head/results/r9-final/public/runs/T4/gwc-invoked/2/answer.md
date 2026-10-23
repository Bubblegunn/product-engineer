I saved the release notes to `RELEASE_NOTES.md`. They cover the 8 commits from `v1.4.0` to `HEAD` (2026-10-16 to 2026-10-22). I only read git history and files. I didn't run any tests or builds.

The notes are written for hotel owners and have four sections:
- **Security:** CSV exports no longer let guest-entered text run as spreadsheet formulas.
- **Fixes:** the day-before reminder now skips cancelled bookings.
- **Speed:** the bookings list loads 50 bookings per page.
- **Under the hood:** an internal change to price rounding that owners shouldn't notice.

Bulk cancel was added and then reverted inside this range, so it isn't listed as a feature. I added a one-line note saying it isn't in this version. You may want to drop that note.

`README.md` still has a "Bulk cancel" section from the docs commit, and the revert didn't remove it. It now describes a feature that doesn't exist, so you probably want to delete that section. I left the README alone.

I couldn't check how the pagination looks in the app. The code change is only the `src/list.js` change, which takes a page number. I described it as a faster list and didn't claim a visible page control.