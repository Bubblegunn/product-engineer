# What's new in StayHub 1.4.1

## Fixes

- **No more reminders for cancelled bookings.** The day-before arrival email was still going out to guests whose bookings had been cancelled. Cancelled bookings are now skipped.
- **Safer CSV exports.** Guest names or other fields that begin with `=`, `+`, `-` or `@` could be run as formulas when you opened an export in Excel or Google Sheets. These cells are now exported as plain text.
- **Prices rounded to the cent.** Stay totals (nightly rate × nights) are now rounded to two decimal places, so you won't see stray fractions of a cent.

## Improvements

- **Faster bookings list.** The bookings list now loads 50 bookings at a time instead of all at once, which keeps it quick as your booking history grows.
