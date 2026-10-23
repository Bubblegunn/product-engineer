# stayhub 1.4.1

## Fixes

- **Cancelled bookings no longer get reminders.** The day-before arrival email was still going out to guests whose bookings had been cancelled. It now only goes to active bookings.
- **Safer spreadsheet exports.** If a guest typed something that looks like a spreadsheet formula into a booking (for example in a name or notes field), opening the CSV export in Excel or Google Sheets could run it. Exports now neutralize these entries, so they show up as plain text.
- **Stay totals are rounded to cents.** The total for a stay (nightly rate × nights) is now rounded to two decimal places, so you won't see odd fractions of a cent.

## Improvements

- **Faster bookings list.** The bookings page now shows 50 bookings per page instead of loading everything at once, which keeps it quick as your booking history grows.
