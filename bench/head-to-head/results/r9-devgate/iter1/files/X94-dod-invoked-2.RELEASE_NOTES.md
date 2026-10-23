# Release Notes — StayHub 1.5.0

Changes since 1.4.0.

## New

- **Late checkout requests.** A guest can now ask for late checkout on their booking. By default, late checkout is held until 14:00.

## Changed

- **Nightly rate is now €135 (was €120).** Quotes for a stay are now calculated at the new rate, so a two-night stay quotes at €270 instead of €240. Please review any prices you have communicated to guests.

## Fixed

- **Safer spreadsheet exports.** Guest names that start with `=`, `+`, `-` or `@` are now neutralised in the CSV export, so opening an export in Excel or Google Sheets can't run them as formulas. Ordinary names are exported unchanged.
- **No more reminders for cancelled bookings.** Arrival reminders are no longer sent for bookings that have been cancelled.
