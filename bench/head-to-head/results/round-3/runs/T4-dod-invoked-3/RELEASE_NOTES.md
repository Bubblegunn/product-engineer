# stayhub 1.4.1 — Release Notes

Changes since 1.4.0.

## Fixes

- **No more reminders for cancelled bookings.** The day-before arrival email is no longer sent to guests whose booking you have cancelled.
- **Safer CSV exports.** Guest names or other fields that begin with `=`, `+`, `-` or `@` could be run as formulas when you opened an export in Excel or Google Sheets. Exports now neutralise these, so the spreadsheet shows them as plain text. A cell like `=SUM(A1)` now appears with a leading apostrophe.

## Improvements

- **Faster bookings list.** The bookings list now loads 50 bookings per page instead of everything at once, so it stays quick as your booking history grows.
- **Cleaner price totals.** Stay totals (nightly rate × nights) are now rounded to two decimal places, which avoids stray fractions of a cent.

## Not included

- Bulk cancel was tried during this cycle and taken back out before release. It is not part of 1.4.1.
