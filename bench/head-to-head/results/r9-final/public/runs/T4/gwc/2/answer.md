I saved the release notes to `RELEASE_NOTES.md`, covering everything since v1.4.0. They have three entries:

- **Faster bookings list:** it now shows 50 bookings per page.
- **Reminder fix:** guests who cancelled no longer get the day-before reminder.
- **CSV export fix:** exported files can't run formulas when opened in a spreadsheet.

I left out the bulk cancel button, because it was added and then reverted within this range, so customers never get it. I also left out the pricing refactor and the version bump, since neither changes anything customers see.

The README still has a "Bulk cancel" section, added in `e94ed75`, for a feature that no longer exists. I didn't touch it, but you may want to remove it.

I titled the notes "1.4.1" because of the version bump commit, but the pagination and reminder commits came after that bump. If they ship in a later release, the heading needs changing.