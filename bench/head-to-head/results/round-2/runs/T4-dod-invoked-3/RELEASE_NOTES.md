# StayHub release notes: changes since v1.4.0

## Fixes

- **No more reminder emails for cancelled bookings.** The day-before arrival reminder was also going out to guests whose booking you had cancelled. Cancelled bookings are now skipped.
- **Safer CSV exports.** If a guest name or other field started with `=`, `+`, `-` or `@`, Excel or Google Sheets could treat it as a formula and run it when you opened the export. Those values are now marked as plain text, so the spreadsheet shows them as written.

## Improvements

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once, which keeps it quick as your booking history grows.
- **Cleaner stay totals.** Stay totals (nightly rate × nights) are now rounded to two decimal places, so you won't see stray fractions of a cent.
