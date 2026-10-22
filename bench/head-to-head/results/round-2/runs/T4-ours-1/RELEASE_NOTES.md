Changes since v1.4.0 (commit bd97d27 to d85083e)
StayHub 1.4.1, 22 October 2026

Your bookings list now shows 50 bookings at a time, so a long list is split into pages instead of arriving all at once.
Cancelled bookings no longer get the day-before reminder; only bookings that are still on will.
Exported booking files (CSV, the spreadsheet format) can no longer run commands when you open them in a spreadsheet program. Guest names or other fields that start with a symbol such as `=` are now shown as plain text.
Stay totals (nightly rate times number of nights) are now rounded to two decimal places, so amounts always show whole cents.

Not in this release:
- Bulk cancel (cancelling several bookings in one step from the bookings page): it was added and then taken back out before release, so it is not available.
