# Release Notes — Version 1.4.1

## Improvements

- **Faster bookings list.** The bookings page now shows 50 bookings per page instead of loading everything at once, so it opens quicker even if you have a lot of reservations.

## Fixes

- **No more reminders for cancelled bookings.** The day-before reminder was also going out for bookings that had been cancelled. Cancelled bookings are now skipped, so guests will only be reminded about stays that are still on.

## Security

- **Safer CSV exports.** Exported booking files could contain text that spreadsheet programs (such as Excel) interpret as a formula and run. Exports are now escaped so that guest-entered text is always treated as plain text when you open the file.
