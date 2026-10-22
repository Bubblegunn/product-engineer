# Release notes: version 1.4.1

## What's new

- **Faster bookings list.** The bookings page now shows 50 bookings at a time. Pages load faster, especially if you have many bookings.

## Fixes

- **Reminders no longer go out for cancelled bookings.** Before this fix, guests who had cancelled could still get the day-before reminder. Now they don't.
- **Safer CSV exports.** If a booking field (for example a guest name) started with a character that spreadsheets treat as a formula, Excel or Google Sheets could run it when you opened the export. Exports now prevent this.

## Good to know

- The bulk cancel button was not released. We removed it before this version. Cancel bookings one at a time, as before.
