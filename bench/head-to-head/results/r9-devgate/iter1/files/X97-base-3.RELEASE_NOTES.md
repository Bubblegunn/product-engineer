# Release Notes

## What's new since v1.4.0

### New
- **Search bookings by guest name.** Find a booking quickly by typing the guest's name. Matching ignores upper and lower case, so "smith" finds "Smith".

### Fixed
- **Exported guest names with commas now stay intact.** Names such as "Smith, John" used to risk splitting across columns in your CSV export. They now appear in a single column.

### Security
- **Safer CSV exports.** Exported files can no longer carry spreadsheet formulas hidden in guest-entered text. This protects you when you open an export in Excel or Google Sheets.

### Other
- Small behind-the-scenes tidying and a README update. These don't change how the product works.
