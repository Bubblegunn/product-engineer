# Release Notes

Changes since v1.4.0.

## Fixes

- **No more reminders for cancelled bookings.** The day-before arrival email is no longer sent to guests whose booking you have cancelled.
- **Safer spreadsheet exports.** Exported CSV files are now protected so that guest-entered text (such as a name or note starting with `=`) cannot run as a formula when you open the file in Excel or Google Sheets.
- **Tidier stay totals.** Totals for a stay (nightly rate × nights) are now rounded to two decimal places, so you won't see stray fractions of a cent.

## Improvements

- **Faster bookings list.** The bookings page now loads 50 bookings at a time instead of everything at once, which keeps it quick as your booking history grows.
