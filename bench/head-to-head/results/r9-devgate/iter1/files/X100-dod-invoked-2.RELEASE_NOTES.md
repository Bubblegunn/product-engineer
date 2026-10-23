# StayHub Release Notes

What's new since version 1.4.0 (current version: 1.6.0).

## New

- **Export your bookings as JSON.** In addition to CSV, you can now export bookings as JSON. Each entry includes the booking ID, guest name and check-in date. Internal-only details are left out.

## Fixed

- **Stay totals are now rounded to the cent.** Totals are rounded to 2 decimals, so a stay no longer shows an odd fraction of a cent when the nightly rate has decimals. Zero-night stays total 0.

## Updates

- **Updated the CSV library** used for exports to version 1.3.0.
- **Requires Node.js 20 or newer** if you host StayHub yourself. Node.js 18 is no longer supported.
