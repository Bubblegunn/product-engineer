# Release Notes: stayhub 1.4.1

## Fixes

- **No more reminders for cancelled bookings.** The day-before arrival reminder email is no longer sent to guests whose booking you have cancelled.
- **Safer CSV exports.** Exported booking files could contain text that a spreadsheet program such as Excel would treat as a formula and run. Exports are now escaped so that cannot happen.

## Improvements

- **Bookings page is paginated.** The bookings list now shows 50 bookings per page instead of loading every booking at once.
