# Release Notes — Version 1.4.1

## Improvements

- **Faster bookings list.** The bookings page now shows 50 bookings at a time instead of loading everything at once, so it opens faster, especially if you have a lot of bookings.

## Fixes

- **No more reminders for cancelled bookings.** Guests who cancelled were still getting the day-before reminder. Cancelled bookings are now skipped.
- **Safer CSV exports.** If a booking field (such as a guest name) started with a character that spreadsheet programs treat as a formula, Excel or Google Sheets could try to run it when you opened the export. Exports are now protected against this.
