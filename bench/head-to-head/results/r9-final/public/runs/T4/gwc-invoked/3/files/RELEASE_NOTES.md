# Release Notes: Version 1.4.1

Changes since version 1.4.0.

## Security

- **Safer spreadsheet exports.** When you export bookings to CSV and open the file in Excel or Google Sheets, guest-entered text (such as a name or note) can no longer run as a spreadsheet formula. Your exports look the same, but they are now safe to open.

## Fixes

- **No more reminders for cancelled bookings.** The day-before reminder was also going out for bookings that had been cancelled. It now skips them, so guests who cancelled won't get a confusing message.

## Performance

- **Faster bookings list.** The bookings list now loads 50 bookings per page instead of all at once, so it opens quicker, especially if you have a lot of bookings.
