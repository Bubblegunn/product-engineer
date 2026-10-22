# StayHub 1.4.1 Release Notes

Changes since version 1.4.0.

## Fixes

- **No more reminders for cancelled bookings.** The day-before arrival reminder email is no longer sent to guests whose booking has been cancelled.
- **Safer CSV exports.** Guest names or other fields that start with `=`, `+`, `-` or `@` could be run as formulas when you opened an exported file in Excel or Google Sheets. These values are now marked as plain text so spreadsheets do not run them.
- **Cleaner stay totals.** The total for a stay (nightly rate × nights) is now rounded to two decimal places, so you won't see amounts with stray fractions of a cent.

## Improvements

- **Faster bookings list.** The bookings list now loads 50 bookings at a time instead of everything at once, which keeps it quick as your booking history grows. Older bookings are on the following pages.
