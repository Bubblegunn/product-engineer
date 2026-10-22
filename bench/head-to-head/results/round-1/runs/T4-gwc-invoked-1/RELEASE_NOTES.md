# Release Notes: what's new since 1.4.0

Version 1.4.1 and the updates that followed.

## Fixes

- **Cancelled bookings no longer get reminder emails.** The day-before arrival reminder was also going out to guests whose booking had been cancelled. It now skips them, so those guests won't get a confusing email.

## Security

- **Safer CSV exports.** If a booking field (for example a guest name) started with a spreadsheet formula, Excel or Google Sheets could run it when you opened the export. Exports now neutralize those values, so they open as plain text.

## Performance

- **The bookings list now loads 50 bookings at a time.** Hotels with a lot of bookings should see the list open faster. Bookings beyond the first 50 appear on the following pages.

## Good to know

- A bulk cancel button for the bookings page was added and then removed again before this release, so it is not available. Cancel bookings one at a time as before.
