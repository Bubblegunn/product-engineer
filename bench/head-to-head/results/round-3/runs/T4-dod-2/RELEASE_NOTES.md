# Release Notes

## Version 1.4.1

### Improvements
- **Faster bookings list.** The bookings page now shows 50 bookings per page instead of loading everything at once, so it opens quickly even if you have a long booking history.

### Fixes
- **Day-before reminders no longer go out for cancelled bookings.** Guests who cancelled will no longer receive a "see you tomorrow" reminder.

### Security
- **Safer CSV exports.** Exported booking files are now protected against spreadsheet formula injection, so text in a booking (such as a guest name) can't run as a formula when you open the file in Excel or Google Sheets.
