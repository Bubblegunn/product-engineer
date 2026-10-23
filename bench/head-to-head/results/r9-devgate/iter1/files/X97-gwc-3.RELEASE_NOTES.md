# Release Notes

Changes since v1.4.0.

## New

- **Search bookings by guest name.** Type part of a guest's name to find their bookings. Capitalisation doesn't matter, so "smith" finds "Smith".

## Fixes

- **Safer CSV exports.** Guest names that begin with `=`, `+`, `-` or `@` could be run as formulas when you opened an export in Excel or Google Sheets. Exports now treat these names as plain text.
- **Guest names with commas export correctly.** A name like "Smith, John" used to spill into the wrong column in exported CSV files. It now stays in the guest column.
