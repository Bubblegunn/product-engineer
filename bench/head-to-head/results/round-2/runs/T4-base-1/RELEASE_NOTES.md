# Release Notes

## Version 1.4.1

### Fixes
- **Cancelled bookings no longer get reminders.** The day-before reminder was also going out for bookings that had been cancelled. It now skips them, so guests who cancelled won't get a confusing message.
- **Safer CSV exports.** Exported booking files could contain text that Excel or Google Sheets would run as a formula. Exports now neutralize this, so opening a file is safe.

### Improvements
- **Faster bookings list.** The bookings list now shows 50 bookings per page, so it loads quicker if you have a lot of bookings.
