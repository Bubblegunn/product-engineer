# StayHub 1.5.0 Release Notes

## What's new

- **Late checkout requests.** A guest's booking can now carry a late checkout request. By default it runs until 14:00.

## What's changed

- **Nightly rate is now €135 (was €120).** Quotes for new stays use the new rate. Please check that this matches the rate you intend to charge.

## What's fixed

- **No more reminders for cancelled bookings.** Guests who cancelled no longer receive a check-in reminder.
- **Safer CSV exports.** Guest names that start with `=`, `+`, `-` or `@` could be run as formulas when you opened an export in Excel or Google Sheets. Exports now neutralise these names so they show up as plain text.
