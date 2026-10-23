# Release Notes

What's new since v1.4.0.

## New

- **Search bookings by guest name.** Type part of a guest's name to find their bookings. Capital and lowercase letters don't matter, so "smith" finds "John Smith".

## Improved

- **Shorter booking list pages.** The bookings list now shows 25 bookings per page instead of 50. You may see more pages than before.

## Fixed

- **Guest names with commas now export correctly.** A name like "Smith, John" used to spill into the wrong column in the CSV export. It now stays in the guest column.
- **Safer CSV exports.** A guest name that starts with `=`, `+`, `-` or `@` could be run as a formula when you opened the export in a spreadsheet app. Exports now treat these names as plain text. The name may show a leading apostrophe (`'`) in the file.
