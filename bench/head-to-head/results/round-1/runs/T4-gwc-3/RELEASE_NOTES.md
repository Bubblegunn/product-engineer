# Release Notes

## Version 1.4.1

### Fixes

- **No more reminders for cancelled bookings.** The day-before reminder was still going out for bookings that had been cancelled. Cancelled bookings are now skipped, so guests won't be reminded about stays they've cancelled.
- **Safer spreadsheet exports.** If you open a CSV export in Excel, Google Sheets, or similar, text that looks like a formula (for example, in a guest name or note) is no longer run by the spreadsheet. Your exports look the same, but they're safe to open.

### Improvements

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once, so it opens faster, especially if you have a lot of bookings.
