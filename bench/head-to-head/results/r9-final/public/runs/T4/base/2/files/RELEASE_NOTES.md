# Release Notes

## Version 1.4.1

### Improvements
- **Faster bookings list.** The bookings page now shows 50 bookings per page, so it loads quickly even when you have a lot of bookings.

### Fixes
- **No more reminders for cancelled bookings.** The day-before reminder was still going out for bookings that had been cancelled. It now skips them, so guests won't get a reminder for a stay they cancelled.
- **Safer CSV exports.** Exported booking files could contain text that spreadsheet programs such as Excel or Google Sheets would treat as a formula and run. Exports are now escaped, so they open as plain data.
