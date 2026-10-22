# Release Notes — Version 1.4.1

## Fixes

- **Cancelled bookings no longer get reminders.** The day-before reminder was still being sent to guests whose bookings had been cancelled. Those reminders are now skipped.
- **Safer CSV exports.** Exported booking files are now protected so that spreadsheet apps such as Excel or Google Sheets can't run guest-entered text as a formula when you open them.

## Improvements

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once, so it opens quicker if you have a lot of bookings.
