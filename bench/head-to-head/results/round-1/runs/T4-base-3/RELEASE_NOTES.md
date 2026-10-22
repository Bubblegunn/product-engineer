# Release Notes – Version 1.4.1

## Improvements

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once, so it opens quicker, especially if you have a lot of bookings.

## Fixes

- **No more reminders for cancelled bookings.** The day-before reminder was also being sent for bookings that had been cancelled. Cancelled bookings are now skipped.
- **Safer CSV exports.** Exported booking files could contain text that a spreadsheet program (such as Excel) would treat as a formula and run. Exports are now escaped so spreadsheets show that text as plain text.
