# Release Notes

## What's new since v1.4.0

### Fixes
- **No more reminders for cancelled bookings.** The day-before reminder was also going out for bookings that had been cancelled. Cancelled bookings are now skipped, so guests who cancelled won't get a reminder.
- **Safer CSV exports.** Guest names or other fields that begin with `=`, `+`, `-` or `@` could be treated as formulas when you opened an export in Excel or Google Sheets. Exports now neutralize these, so your spreadsheet shows them as plain text.

### Improvements
- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once, so it stays quick even with a large number of bookings.

### Good to know
- A bulk cancel button was tried for the bookings page but was withdrawn before release. It is not part of this version.
