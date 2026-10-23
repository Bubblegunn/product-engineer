I saved the release notes to `RELEASE_NOTES.md` as version 1.4.1. They cover the three fixes and one improvement since v1.4.0. I haven't committed the file.

- **Fixes:**
  - Cancelled bookings no longer get the day-before reminder email.
  - CSV exports no longer let spreadsheet formulas run.
  - Stay totals are rounded to cents.
- **Improvement:** the bookings list now shows 50 bookings per page.

I left out the bulk cancel button. It was added and then reverted within this range, so it isn't in the release.

The README still has a "Bulk cancel" section from the commit `e94ed75`. That section now describes a feature that doesn't exist, so you probably want to remove it.

The pagination change gives `listBookings` a `page` argument that defaults to 1. Any code that expected the full list will now get only the first 50 bookings. I only checked the diff, not the callers, and I didn't mention this in the notes.