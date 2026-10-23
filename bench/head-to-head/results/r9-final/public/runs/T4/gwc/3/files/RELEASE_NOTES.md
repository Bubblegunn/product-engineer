# Release Notes: version 1.4.1

## Fixes

- **Cancelled bookings no longer get reminder emails.** Guests who had cancelled were still receiving the "see you tomorrow" email the day before their arrival date. They no longer do.
- **Safer CSV exports.** If a booking contained text that a spreadsheet could read as a formula (for example, a guest name starting with `=`), Excel or Google Sheets could run it when you opened the export. Exports now escape these values so they show up as plain text.
- **Stay totals are rounded to the cent.** Nightly rate × number of nights is now rounded to two decimal places, so you won't see totals with stray fractions of a cent.

## Improvements

- **Faster bookings list.** The bookings page now shows 50 bookings at a time instead of loading all of them at once. This keeps the page quick as your booking history grows.
