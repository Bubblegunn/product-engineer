# StayHub 1.4.1 — Release Notes

What's new since 1.4.0.

## Fixes

- **No more reminders for cancelled bookings.** The day-before arrival email is no longer sent to guests whose booking you have cancelled.
- **Safer spreadsheet exports.** If a guest name or other field starts with `=`, `+`, `-` or `@`, your CSV export now marks it as plain text, so Excel or Google Sheets won't try to run it as a formula. Exports otherwise look the same.

## Improvements

- **Faster bookings list.** The bookings list now loads 50 bookings at a time instead of everything at once, which keeps it quick as your booking history grows.
