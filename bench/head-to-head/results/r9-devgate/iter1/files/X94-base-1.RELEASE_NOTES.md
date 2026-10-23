# Release Notes: Version 1.5.0

## New
- **Late checkout requests.** A guest can now ask for a late checkout. If you grant it, the booking records the time, and the default is 14:00.

## Fixes
- **No more reminders for cancelled bookings.** Arrival reminders were also going out for bookings that had been cancelled. They now go only to active bookings.
- **Safer CSV exports.** A guest name that starts with `=`, `+`, `-` or `@` could be run as a formula when you opened the export in Excel or Google Sheets. Exports now treat these names as plain text.
