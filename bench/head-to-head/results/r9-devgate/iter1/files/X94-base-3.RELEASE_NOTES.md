# StayHub 1.5.0

## What's new

- **Late checkout requests.** A guest's booking can now carry a late checkout request. By default it runs until 14:00.

## Changes to be aware of

- **The nightly rate used in price quotes is now €135 (up from €120).** A 3-night stay now quotes at €405 instead of €360.

## Fixes

- **Cancelled bookings no longer get arrival reminders.** Previously a guest who had cancelled could still be reminded about check-in.
- **Safer CSV exports.** Guest names that start with `=`, `+`, `-` or `@` are now marked as plain text in the export. This stops a malicious name from running as a formula when you open the file in Excel or Google Sheets.

## Setup

- The README now explains setup, including the `BOOKINGS_FILE` variable that tells the reminder job where your bookings file is.
