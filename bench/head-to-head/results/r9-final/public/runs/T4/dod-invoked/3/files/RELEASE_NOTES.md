# StayHub 1.4.1 — Release Notes

Changes since version 1.4.0.

## Fixes

- **No more reminders for cancelled bookings.** The day-before reminder email is now only sent to guests whose booking is still active. Previously, a guest who had cancelled could still receive a "see you tomorrow" email.
- **Safer CSV exports.** If a guest name or other field begins with `=`, `+`, `-` or `@`, spreadsheet programs such as Excel could treat it as a formula and run it. Exports now neutralize these entries, so opening a booking export is safe.

## Improvements

- **Faster bookings list.** The bookings page now shows 50 bookings per page instead of loading everything at once, so it stays quick as your booking history grows.
- **Accurate totals.** Stay totals (nightly rate × number of nights) are now rounded to the cent, so you won't see stray fractions of a cent in prices.
