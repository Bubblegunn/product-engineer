# Release Notes

Changes since v1.4.0, up to the current version (1.6.0).

## New

- **JSON export.** You can now export your bookings as JSON as well as CSV. Each entry includes the booking ID, guest name and check-in date.

## Fixed

- **Stay totals are now rounded to 2 decimals.** Totals for a stay (nights × nightly rate) could previously show tiny fractional differences, such as 0.30000000000000004 instead of 0.30. Totals now always show as a proper amount.
