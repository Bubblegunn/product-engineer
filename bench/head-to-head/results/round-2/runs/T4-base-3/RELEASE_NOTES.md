# Release Notes

## Version 1.4.1

### Improvements
- **Faster bookings list:** The bookings list now loads 50 bookings per page instead of everything at once, so it opens quicker if you have a lot of bookings.

### Fixes
- **Day-before reminders:** Reminders are no longer sent for cancelled bookings, so guests who have cancelled won't get a message about a stay they're no longer making.
- **Safer CSV export:** Exported CSV files are now protected so that spreadsheet programs (Excel, Google Sheets, etc.) won't run formulas hidden in booking data such as guest names or notes.
