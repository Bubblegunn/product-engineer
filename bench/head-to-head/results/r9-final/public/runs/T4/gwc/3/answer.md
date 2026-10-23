I saved the release notes to `RELEASE_NOTES.md`, titled "version 1.4.1". They cover everything since v1.4.0 and are written for hotel owners, not developers. I haven't committed the file.

- **Fixes:** cancelled bookings no longer get the day-before reminder email. CSV exports now escape formula-like text, so spreadsheets don't run it. Stay totals are rounded to the cent.
- **Improvements:** the bookings list now loads 50 bookings per page, so it stays quick as history grows.
- **Left out on purpose:** the bulk cancel button was added and then reverted within this range, so customers never get it. The pricing helper refactor and the version bump are internal.

**README still documents bulk cancel:** commit `e94ed75` added a "Bulk cancel" section to `README.md`, and the revert didn't remove it. The README now describes a feature that doesn't exist. I left it alone since you only asked for release notes, but it should probably be removed.

**Pagination needs a page control:** `listBookings` takes a `page` argument. I didn't check whether the bookings page has a way to move between pages. If it doesn't, owners can only see the first 50 bookings. You may want to check that before shipping.