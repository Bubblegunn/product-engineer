# StayHub — What's New Since v1.4.0

## New
- **Search bookings by guest name.** Type a guest's name to find their booking quickly. Matching ignores upper/lower case, so "smith" finds "Smith".

## Fixes
- **Safer CSV exports.** Exported bookings can no longer carry hidden spreadsheet formulas. A guest name or note that starts like a formula is now treated as plain text when you open the file in Excel or Google Sheets. We recommend updating promptly.
- **Guest names with commas export correctly.** A name like "Smith, John" used to spill across two columns in the CSV. It now stays in one column.

## Behind the scenes
- Internal cleanup and extra automated checks around search, export and the bookings list. No change to how these look or work.
