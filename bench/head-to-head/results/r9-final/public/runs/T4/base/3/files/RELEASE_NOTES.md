# Release Notes

Changes since version 1.4.0.

## Improvements

- **Faster bookings list.** The bookings page now shows 50 bookings per page instead of loading everything at once, so it opens quicker, especially if you have a lot of bookings.

## Fixes

- **Safer CSV exports.** Exported booking files can no longer run formulas when opened in Excel, Google Sheets or similar spreadsheet programs. Guest-entered text that looked like a formula is now treated as plain text.
- **No more reminders for cancelled bookings.** The day-before reminder is no longer sent for bookings that have been cancelled.
