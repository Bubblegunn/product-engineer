# Release Notes: Version 1.4.1

Changes since version 1.4.0 (released updates through 2026-10-22).

## Security

- **Safer spreadsheet exports.** When you export bookings to CSV, text that a spreadsheet could mistake for a formula is now escaped. Opening an export in Excel or Google Sheets will no longer run anything unexpected, for example from a guest name or note.

## Fixes

- **No more reminders for cancelled bookings.** The day-before reminder skips bookings that have been cancelled, so guests who cancelled won't get a reminder for a stay they no longer have.
- **Stay totals are rounded to the cent.** The total for a stay (nightly rate × nights) is now rounded to two decimal places, so you won't see totals with stray fractions of a cent.

## Improvements

- **Faster bookings list.** The bookings page now shows 50 bookings per page instead of loading everything at once, so it stays quick as your booking history grows.

## Note

A bulk cancel button for the bookings page was added and then removed again before this release, so it is not part of 1.4.1.
