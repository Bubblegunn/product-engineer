# What's new in StayHub 1.4.1

## Fixes

- **No more reminders for cancelled bookings.** The day-before reminder email was still going to guests who had cancelled. It now goes only to guests with active bookings.
- **Safer CSV exports.** If a booking field (such as a guest name) started with a spreadsheet formula, Excel or Google Sheets could run it when you opened the export. Exports now stop this from happening.

## Improvements

- **Faster bookings list.** The list now shows 50 bookings per page, so it loads faster when you have many bookings.
