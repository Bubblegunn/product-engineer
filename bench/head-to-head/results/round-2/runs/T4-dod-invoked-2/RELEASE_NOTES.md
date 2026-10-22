# StayHub 1.4.1 Release Notes

What's new since 1.4.0.

## Fixes

- **No more reminder emails for cancelled bookings.** The day-before arrival reminder is no longer sent to guests who have cancelled, so they won't get a confusing message about a stay they dropped.
- **Safer CSV exports.** If a guest's name or notes start with characters that spreadsheet programs treat as formulas, Excel and Google Sheets will no longer run them when you open an export. This protects you from malicious text entered in booking forms.

## Improvements

- **Faster bookings list.** The bookings list now loads 50 bookings per page instead of everything at once, so it stays quick as your booking history grows.
- **Accurate stay totals.** Totals for a stay (nightly rate × nights) are now rounded to two decimal places, so you won't see stray fractions of a cent.
