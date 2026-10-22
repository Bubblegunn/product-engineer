Changes since v1.4.0 (commit b751f09 to d85083e)
Version 1.4.1

Guests whose booking was cancelled no longer get a day-before reminder; only bookings that are still on will.
The bookings list now shows 50 bookings at a time instead of all of them at once, so a long list is split into pages.
Exported spreadsheet (CSV) files can no longer run commands when you open them in Excel or similar. A guest name that starts with a character like "=" is now shown as plain text.
Stay totals are now rounded to two decimal places (cents), so a rate times a number of nights never shows a fraction of a cent.

Not in this release:
- Bulk cancel button on the bookings page: it was added and then taken back out during this range, so it is not available.
