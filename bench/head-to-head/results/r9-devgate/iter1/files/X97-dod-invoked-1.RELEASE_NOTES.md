# StayHub release notes — changes since v1.4.0

## New

- **Search bookings by guest name.** Type any part of a guest's name to find their bookings. Capitalisation doesn't matter, so "smith" finds "Smith".

## Improvements

- **Shorter booking pages.** The bookings list now shows 25 bookings per page instead of 50, so each page is quicker to scan. Your bookings are the same; there are just more pages.

## Fixes

- **Safer CSV export (security).** If a guest name begins with `=`, `+`, `-` or `@`, spreadsheet programs such as Excel could treat it as a formula and run it when you opened the export. Those names are now exported as plain text.
- **Guest names with commas export correctly.** A name like "Doe, Jane" used to split into two columns in the exported CSV and shift the rest of the row. It now stays in one column.

## Documentation

- The README now explains how to download your bookings as a CSV file with the Export button.
