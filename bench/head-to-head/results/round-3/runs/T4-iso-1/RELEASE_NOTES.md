# StayHub 1.4.1 release notes

## Fixes

- **No more reminders for cancelled bookings.** Guests who cancelled were still getting the "see you tomorrow" email the day before their stay. Reminders now go only to active bookings.
- **Safer spreadsheet exports.** If a booking field (such as a guest name) started with a character that spreadsheets treat as a formula, Excel or Sheets could run it when you opened the CSV export. These values are now escaped so they show as plain text.
- **Stay totals rounded to the cent.** The total for a stay (nightly rate × nights) is now rounded to two decimal places, so you won't see amounts with stray fractions of a cent.

## Improvements

- **Faster bookings list.** The bookings list now loads 50 bookings per page instead of all at once, which keeps it quick as your booking history grows.
