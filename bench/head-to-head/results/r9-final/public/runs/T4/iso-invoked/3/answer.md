I saved the release notes to `RELEASE_NOTES.md`. They cover the 8 commits since v1.4.0, written for hotel owners. I followed the three skills you named (parts 1, 3 and 5 of ISO 24495).

The notes cover five points:
- **CSV export:** guest names that start with `=`, `+`, `-` or `@` can no longer run as spreadsheet formulas.
- **Reminders:** guests with a cancelled booking no longer get the day-before reminder.
- **Bookings list:** the list now loads 50 bookings at a time.
- **Nightly totals:** totals are now rounded to the cent.
- **Bulk cancel:** it was added and then reverted, so the notes say it is not in this release.

Two things need your attention:
- **README is wrong.** `README.md` still has a "Bulk cancel" section from commit e94ed75, but the feature was reverted. You should remove that section.
- **Pagination is unconfirmed.** `listBookings` in `src/list.js` now takes a `page` argument that defaults to 1. I saw no page controls in this repo. If the bookings page doesn't pass a page number, owners would only see their first 50 bookings. Please check this before you ship. The notes say that later bookings "appear on the following pages", which assumes the page controls exist.

I did not commit anything.