I saved the release notes in `RELEASE_NOTES.md`, and they pass the `product-engineer notes` check against v1.4.0. They start with "Changes since v1.4.0" and cover the 8 commits since then. The notes say what each change means for hotel owners:

- **Bookings list:** it now shows 50 bookings at a time. I didn't claim it's faster, because nothing in the range measures that.
- **Reminders:** guests with a cancelled booking no longer get the day-before reminder.
- **Spreadsheet export:** exported files can no longer run commands when opened. The note says what this protects and gives no steps for abusing the flaw.
- **Stay totals:** totals are now rounded to whole cents. This is my reading of the pricing cleanup, since the code change also rounds the total.
- **Not in this release:** bulk cancel, because it was added and then reverted. I did not announce it as available.

I left out the version bump and the README change, since neither is something customers would notice.

Two things need your attention:
- **README:** it still says "Select several bookings on the bookings page and cancel them in one step", but that feature was reverted. The README should be corrected.
- **Pagination:** I found nothing in the code that lets a user move to page 2. Please check that the bookings page has a way to do it. If it doesn't, owners would see only their first 50 bookings.