# StayHub Release Notes

Changes since v1.4.0 (now at v1.6.0).

## What's new

- **Export bookings as JSON.** In addition to CSV, you can now export your bookings as JSON (guest, check-in date and booking ID). This makes it easier to move your data into other tools.

## Fixes

- **Stay totals are now rounded to the cent.** Totals for a stay (nights × nightly rate) are rounded to 2 decimals, so you no longer see odd fractions of a cent on quotes.

## Good to know

- **Node.js 20 or newer is now required** (previously Node 18).
- The CSV library used for exports was updated to a newer version.
- Small documentation fixes.
