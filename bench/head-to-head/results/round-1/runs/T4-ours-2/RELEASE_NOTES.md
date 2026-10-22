Changes since v1.4.0 (commit bd97d27 to d85083e)
Version 1.4.1

Exported booking files (CSV, the spreadsheet format) can no longer run commands when you open them in a spreadsheet program, because guest names or other text starting with =, +, - or @ are now stored as plain text.
Guests with a cancelled booking no longer get the day-before reminder; only bookings that are still on will.
The bookings list now shows 50 bookings at a time instead of all of them at once, so a long list is split into pages you move through.
Stay totals are now rounded to two decimal places (for example, to the cent), so a nightly rate times the number of nights no longer produces a total with stray extra digits.

Not in this release:
- Bulk cancel button on the bookings page: it was added and then taken back out before release, so it is not available.
