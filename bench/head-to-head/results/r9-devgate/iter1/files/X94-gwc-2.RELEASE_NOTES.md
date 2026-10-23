# Release Notes: Version 1.5.0

## New
- **Late checkout requests.** A guest's booking can now carry a late checkout request. If no time is given, it defaults to 14:00.

## Changed
- **Nightly rate is now €135 (was €120).** Stay quotes use the new rate, so a 3-night stay quotes at €405 instead of €360. Check that this matches the rate you want to charge.

## Fixed
- **Cancelled bookings no longer trigger reminders.** Guests who cancelled won't get a check-in reminder.
- **Safer CSV exports.** A guest name that starts with `=`, `+`, `-` or `@` could be run as a formula when you opened an export in Excel or Google Sheets. Exports now neutralise these names, so they show up as plain text.
