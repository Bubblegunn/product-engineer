# Release Notes

What's new since v1.4.0.

## New

- **Search bookings by guest name.** Type part of a guest's name to find their bookings. Capitals don't matter, so "smith" finds "Smith".

## Fixed

- **Guest names with commas now export correctly.** A name like "Smith, John" used to split across two columns in the CSV export. It now stays in one column.
- **Safer spreadsheet exports.** Guest names that start with `=`, `+`, `-` or `@` could be run as formulas when you opened an export in Excel or Google Sheets. These names are now treated as plain text. If you export bookings, this protects you from malicious entries.

## Under the hood

We also made small tidy-ups, README updates and extra tests. You won't notice any change from them.
