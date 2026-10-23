# Release Notes: version 1.4.1

## Fixes

- **Cancelled bookings no longer get reminders.** Guests who cancelled were still receiving the day-before reminder. They no longer do.
- **Safer spreadsheet exports.** Some booking details, such as a guest name that starts with `=`, could be run as a formula when you opened a CSV export in Excel or Google Sheets. Exports now prevent this.

## Improvements

- **Faster bookings list.** The list now shows 50 bookings per page, so it opens faster when you have a lot of bookings.
