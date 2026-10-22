# Release Notes

## Version 1.4.1

### Improvements
- **Faster bookings list.** The bookings page now shows 50 bookings per page instead of loading everything at once, so it opens quicker if you have a lot of bookings.

### Fixes
- **Cancelled bookings no longer get reminders.** Guests whose booking was cancelled will no longer receive the day-before reminder.
- **Safer CSV exports.** Exported booking files are now protected so that spreadsheet programs such as Excel won't run formulas hidden in guest-entered text (for example, a name that starts with `=`).
