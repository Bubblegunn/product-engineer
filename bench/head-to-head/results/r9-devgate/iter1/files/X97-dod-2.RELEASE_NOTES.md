# StayHub – What's New Since v1.4.0

## New

- **Search bookings by guest name.** Type part of a guest's name to find their bookings. Capitalization doesn't matter, so "smith", "Smith" and "SMITH" all find the same guest.

## Fixed

- **Guest names with commas now export correctly.** Previously, a name like "Smith, John" could shift the columns in your CSV export. Names are now kept in a single column.

## Security

- **Safer CSV exports.** If a guest's name starts with a character that spreadsheet apps treat as a formula (such as `=`, `+`, `-` or `@`), the export now stops it from running when you open the file in Excel or Google Sheets. The name still appears as entered.
