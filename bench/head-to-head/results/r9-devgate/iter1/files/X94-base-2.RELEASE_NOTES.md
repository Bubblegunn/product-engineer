# Release Notes: Version 1.5.0

## What's new

- **Late checkout requests.** A guest's booking can now carry a late checkout request. By default the request is for 14:00, and a different time can be set.

## Fixes

- **No more reminders for cancelled bookings.** Arrival reminders were also going out for bookings that had been cancelled. Cancelled bookings are now skipped.
- **Safer CSV exports.** A guest name that starts with `=`, `+`, `-` or `@` could be run as a formula when you opened the export in Excel or Google Sheets. These names are now marked so they show up as plain text. Ordinary names look the same as before.
