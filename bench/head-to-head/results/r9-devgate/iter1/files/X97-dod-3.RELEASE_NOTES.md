# StayHub – What's New Since v1.4.0

## New

- **Search bookings by guest name.** Type part of a guest's name to find their bookings quickly. Search ignores capitalization, so "smith", "Smith" and "SMITH" all find the same guest.

## Fixed

- **Guest names with commas now export correctly.** Names such as "Smith, John" used to split across two columns in the CSV export. They now stay in the guest column when you open the file in Excel, Numbers or Google Sheets.

## Security

- **Safer CSV exports.** If a guest name starts with `=`, `+`, `-` or `@`, spreadsheet apps could treat it as a formula and run it when you open the export. StayHub now marks these names as plain text, so your exported files are safe to open.

## Behind the scenes

We also made small internal cleanups and added more automated tests to keep these features reliable. There is nothing you need to do.
