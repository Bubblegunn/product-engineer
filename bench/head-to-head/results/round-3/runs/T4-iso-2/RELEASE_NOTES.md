# What's new in StayHub 1.4.1

## Fixes

- **No more reminders for cancelled bookings.** Guests who cancelled no longer get the day-before arrival reminder email.
- **Safer CSV exports.** If a guest name or other field starts with `=`, `+`, `-` or `@`, your spreadsheet app could treat it as a formula and run it. Exports now prevent this. Such entries appear with a leading apostrophe (for example `'=SUM(1+1)`).

## Improvements

- **A faster bookings list.** The bookings page now shows 50 bookings at a time instead of loading all of them, which helps if you have a long booking history.
- **Tidier stay totals.** The total price for a stay is now rounded to two decimal places (cents), so you won't see totals with stray fractions.
