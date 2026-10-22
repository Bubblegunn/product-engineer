# Release Notes

## Since v1.4.0 (version 1.4.1)

### Fixes

- **No more reminders for cancelled bookings.** The day-before reminder email was still going out to guests whose bookings you had cancelled. Cancelled bookings are now skipped.
- **Safer CSV exports.** If a booking field (a guest name or note, for example) started with a spreadsheet formula, Excel or Google Sheets could run it when you opened an exported file. Exports now neutralise these, so your data opens as plain text.

### Improvements

- **Faster bookings list.** The bookings page now shows 50 bookings per page instead of loading everything at once, so it stays quick as your booking history grows.
