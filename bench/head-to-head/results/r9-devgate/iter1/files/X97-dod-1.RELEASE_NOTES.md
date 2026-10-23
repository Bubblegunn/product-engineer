# StayHub – What's New Since v1.4.0

## New

- **Search bookings by guest name.** Type part of a guest's name to find their bookings. Capital and lowercase letters don't matter, so "smith" finds "Anna Smith".

## Fixes

- **Safer CSV exports.** Guest names that begin with a character spreadsheet programs treat as a formula (`=`, `+`, `-` or `@`) are now exported as plain text. This stops a booking made with a malicious name from running a formula when you open the export in Excel or Google Sheets. We recommend updating if you share exported files with staff or accountants.
- **Guest names with commas export correctly.** Names such as "Smith, John" used to split across two columns in the CSV and shift the rest of the row. They now stay in a single column.
