# Release Notes: version 1.5.0

## What's new

- **Late checkout requests.** A guest can now ask for a late checkout. If approved, the booking records a checkout time of 14:00 by default.

## Changes to be aware of

- **The nightly rate is now €135, up from €120.** Quotes for new stays use the new rate, so a 3-night stay is quoted at €405 instead of €360.

## Fixes

- **Cancelled bookings no longer trigger arrival reminders.** Before this fix, a reminder could still go out for a booking that had been cancelled.
- **Safer CSV exports.** A guest name that starts with `=`, `+`, `-` or `@` could be run as a formula when you opened the exported bookings file in Excel or Google Sheets. These names are now exported as plain text, so the file is safe to open.
