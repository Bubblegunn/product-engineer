# Release Notes: since v1.4.0

## New

- **Search bookings by guest name.** Type part of a guest's name to find their bookings. Capitals don't matter, so "smith" finds "Smith".

## Fixed

- **Guest exports now open correctly in Excel and Google Sheets when a name contains a comma.** Before, a name like "Smith, John" was split across two columns and pushed the check-in date out of place.

## Security

- **Safer booking exports.** A guest name that starts with `=`, `+`, `-` or `@` can no longer run as a formula when you open the exported file in a spreadsheet. The name now shows as plain text.

## Behind the scenes

We also made some small code cleanups and added tests for search and export. They don't change anything you'll see.
