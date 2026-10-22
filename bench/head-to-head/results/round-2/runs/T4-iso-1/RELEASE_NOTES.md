# Release notes: changes since version 1.4.0

## Fixes

- **No more reminders for cancelled bookings.** The day-before reminder email was still going to guests who had cancelled. Cancelled bookings are now skipped.
- **Safer CSV exports.** If a booking field (such as a guest name) began with a spreadsheet formula, Excel or Google Sheets could run it when you opened the export. Exports now stop that from happening. Your exported data looks the same as before.

## Improvements

- **The bookings list now loads one page at a time.** Each page shows 50 bookings, which keeps the list quick when you have many bookings.
