# Release Notes

Changes since v1.4.0.

## New

- **Search bookings by guest name.** Type part of a guest's name to find their bookings. Capitalization doesn't matter, so "smith" finds "Smith".

## Fixes

- **Safer CSV exports.** Exported booking files could contain guest names that a spreadsheet program such as Excel would treat as a formula. Exports now neutralize these names, so opening an export is safe. Names that start with `=`, `+`, `-` or `@` now appear with a leading apostrophe in the exported file.
- **Guest names with commas export correctly.** A name such as "Smith, John" used to spill into the wrong column in the CSV export. It now stays in the guest column.

We recommend all customers update to get the CSV export security fix.
