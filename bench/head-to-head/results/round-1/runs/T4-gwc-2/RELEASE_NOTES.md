# Release Notes — Version 1.4.1

## Fixes

- **No more reminders for cancelled bookings.** The day-before reminder was also going out for bookings that had been cancelled. Cancelled bookings are now skipped, so guests who cancelled won't get a confusing message.
- **Safer spreadsheet exports.** If a guest name or other field started with `=`, `+`, `-` or `@`, a spreadsheet app could treat it as a formula when you opened the CSV export. These values are now escaped, so they display as plain text.
- **Stay totals are rounded to the cent.** The total for a stay (nightly rate × number of nights) is now rounded to two decimal places, so you won't see totals with stray fractions of a cent.

## Improvements

- **Faster bookings list.** The bookings list now loads 50 bookings per page instead of everything at once, which keeps it quick even with a large number of bookings.
