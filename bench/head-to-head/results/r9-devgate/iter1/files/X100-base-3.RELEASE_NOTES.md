# StayHub Release Notes

Changes since v1.4.0 (current version: 1.6.0)

## New

- **Export bookings as JSON.** Besides CSV, you can now export your bookings as JSON. Each entry has the booking ID, guest name and check-in date. This makes it easier to move your booking data into other tools.

## Fixed

- **Stay totals are now rounded to the cent.** Totals for a stay (nights × nightly rate) are now rounded to 2 decimal places. Before, some rates could produce totals with stray fractions of a cent, such as 0.30000000000000004 instead of 0.30.

## Under the hood

- Updated the CSV library we use for exports. You don't need to do anything.
