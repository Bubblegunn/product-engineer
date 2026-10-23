# StayHub 1.5.0 Release Notes

## What's new

- **Late checkout requests.** A guest can now ask for late checkout. If granted, the booking records a checkout time of 14:00 by default.

## What's changed

- **New nightly rate: €135.** Stay quotes are now calculated at €135 per night, up from €120. A three-night stay now quotes at €405 instead of €360.

## Fixes

- **Safer CSV exports.** A guest name that starts with `=`, `+`, `-` or `@` could be run as a formula when you opened the export in Excel or Google Sheets. These names are now exported as plain text.
- **No reminders for cancelled bookings.** Check-in reminders were also going out for cancelled bookings. They are now skipped.

## Setup note

The reminder job reads your bookings file from the path in the `BOOKINGS_FILE` environment variable. The README now explains this.
