# Release Notes

## What's new since v1.4.0 (now at v1.4.1)

### Fixes
- **Safer CSV exports.** Exported booking files can no longer run formulas when you open them in Excel, Numbers or Google Sheets. Guest names or notes that start with characters like `=` or `+` now show up as plain text.
- **Correct day-before reminders.** Reminders are no longer sent for bookings that have been cancelled, so guests won't get a reminder for a stay they cancelled.

### Improvements
- **Faster bookings list.** The bookings page now shows 50 bookings per page, so it opens quicker when you have a lot of reservations.

### Good to know
- Bulk cancel was briefly added during this period but removed again before release. It is not part of v1.4.1. You still cancel bookings one at a time.
