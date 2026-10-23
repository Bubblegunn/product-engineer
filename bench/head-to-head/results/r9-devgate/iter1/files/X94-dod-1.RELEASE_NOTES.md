# Release Notes — v1.5.0

## What's new

- **Late checkout requests.** A guest can now ask for a late checkout. The request is added to their booking, and the default checkout time is 14:00.

## What's changed

- **Nightly rate is now €135 (was €120).** Quotes for new stays use the new rate, so a 3-night stay is quoted at €405 instead of €360.

## Fixes

- **No more reminders for cancelled bookings.** Arrival reminders were also going out for bookings that had been cancelled. Cancelled bookings are now skipped.
- **Safer CSV exports.** A guest name that begins with `=`, `+`, `-` or `@` could be run as a formula when you opened the exported file in Excel or Google Sheets. Those names now show up as plain text. Ordinary guest names look the same as before.
