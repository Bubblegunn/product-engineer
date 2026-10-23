# Release Notes: Version 1.4.1

## What's new

- **Faster bookings list.** The bookings page now shows 50 bookings at a time. It loads faster, even if you have a lot of bookings.

## What we fixed

- **Cancelled bookings no longer get reminders.** Guests who cancelled were still receiving the day-before reminder. They no longer do.
- **Safer CSV exports.** If a booking field started with a spreadsheet formula, Excel or Google Sheets could run it when you opened the export. We now prevent this, so exported files are safe to open.
