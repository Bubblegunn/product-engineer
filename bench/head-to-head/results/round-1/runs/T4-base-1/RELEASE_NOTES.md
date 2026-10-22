# Release Notes: Version 1.4.1

## Improvements

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once, so it opens quicker, especially if you have a lot of bookings.

## Fixes

- **Cancelled bookings no longer get reminders.** The day-before reminder was also going out for bookings that had been cancelled. It now skips them, so guests who cancelled won't be contacted.
- **Safer CSV exports.** Exported booking files could contain text that spreadsheet programs such as Excel treat as a formula and run. Exports are now protected against this, so you can open them safely.
