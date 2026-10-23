# StayHub — What's new since v1.4.0

## New

- **Search bookings by guest name.** Type part of a guest's name to find their booking. Capitals don't matter: "smith", "Smith" and "SMITH" all find the same guest.

## Fixes

- **Safer CSV export.** If a guest name starts with a character that spreadsheet programs treat as a formula (such as `=`, `+`, `-` or `@`), the export now marks it as plain text. Opening the file in Excel or Google Sheets can no longer run a formula hidden in a guest name.
- **Guest names with commas export correctly.** A name like "Doe, Jane" used to be split across two columns in the exported CSV. It now stays in one column.

## Documentation

- The README now explains how to download your bookings as a CSV file with the Export button.

_Prices and nightly rates are unchanged in this release._
