# What's new since v1.4.0

## Fixes

- **Safer CSV exports.** Exported booking files could contain text that Excel or Google Sheets would treat as a formula and run when opened. Exports are now escaped so they open as plain text.
- **No more reminders for cancelled bookings.** The day-before reminder email was still going out to guests whose booking you had cancelled. It now skips them.

## Improvements

- **Faster bookings list.** The bookings page now shows 50 bookings per page instead of loading everything at once, so it opens quicker if you have a lot of bookings.

## Other

- Version 1.4.1 is the current release.
