# Release Notes

## Changes since v1.4.0

### Improvements
- **Faster bookings list:** The bookings page now shows 50 bookings per page instead of loading everything at once, so it opens quicker if you have a lot of bookings.

### Fixes
- **Day-before reminders:** Guests whose bookings were cancelled no longer receive the day-before reminder.
- **Safer CSV exports:** Exported booking files can no longer run formulas when opened in Excel or Google Sheets. Guest-entered text that starts with characters like `=` is now handled safely.
