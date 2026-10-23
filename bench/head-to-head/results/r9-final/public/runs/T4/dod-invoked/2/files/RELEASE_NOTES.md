# What's new in StayHub 1.4.1

## Safer guest-list exports
When you export your bookings to a spreadsheet, a guest name that starts with a character like `=`, `+`, `-` or `@` could be treated by Excel or Google Sheets as a formula and run. Exports now neutralise these entries, so the file opens safely and shows the guest name as written.

## Faster bookings page
The bookings list now loads 50 bookings at a time instead of everything at once, so the page stays quick as your booking history grows.

## Reminder emails
Guests whose booking was cancelled no longer receive the day-before arrival reminder.

## Pricing
Stay totals are now rounded to the nearest cent, so you won't see totals with stray fractions of a cent.
