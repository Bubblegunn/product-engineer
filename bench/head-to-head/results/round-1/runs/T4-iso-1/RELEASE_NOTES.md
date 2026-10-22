# What's new since version 1.4.0

## Fixes

- **Cancelled bookings no longer get reminders.** The day-before reminder email used to go out even for bookings that guests had cancelled. It now skips them.
- **Safer spreadsheet exports.** If a booking contained text that looks like a spreadsheet formula (for example, in a guest name or note), Excel or Google Sheets could run it when you opened the CSV export. Exports now prevent this.

## Improvements

- **The bookings list loads faster.** It now shows 50 bookings per page instead of loading everything at once, which helps if you have many bookings.

## Good to know

- The bulk cancel button was not released. We removed it before release, so you will not see it on the bookings page. Cancel bookings one at a time for now.
