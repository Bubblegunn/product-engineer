Changes since v1.4.0 (commit bd97d27 to d85083e)
StayHub 1.4.1

Guests who cancelled no longer get a day-before reminder; only bookings that are still on will be reminded.
The bookings list now shows 50 bookings at a time, so a long list is split into pages instead of arriving all at once.
Booking exports (CSV files, the kind you open in Excel or Google Sheets) can no longer run commands when you open them, because a guest name or other text starting with `=`, `+`, `-` or `@` is now saved as plain text.
Stay totals are now rounded to two decimal places (whole cents), so a price like 89.99 for 3 nights shows as 269.97 rather than a long trailing-digit number.

Not in this release:
- Bulk cancel button on the bookings page: it was added during this period and then taken back out, so you will not see it.
