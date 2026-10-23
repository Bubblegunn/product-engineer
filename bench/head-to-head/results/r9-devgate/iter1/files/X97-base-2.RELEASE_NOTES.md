# What's New Since v1.4.0

## New

- **Search bookings by guest name.** Type part of a guest's name to find their bookings. Capitalisation doesn't matter, so "smith", "Smith" and "SMITH" all find the same guest.

## Fixes

- **Safer spreadsheet exports.** Guest names that begin with `=`, `+`, `-` or `@` are now marked as plain text in CSV exports. Before this, opening an export in Excel or Google Sheets could run such a name as a formula. We recommend updating if you export bookings or share exports with your team.
- **Guest names with commas export correctly.** A name like "Smith, John" used to split across two columns in the CSV export and shift the rest of the row. It now stays in one column.
