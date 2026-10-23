# StayHub 1.5.0 — Release Notes

What's new since 1.4.0.

## New

- **Late checkout requests.** Guests can now ask for a late checkout. By default the request is recorded as granted until 14:00.

## Improved

- **Safer CSV exports.** Guest names that start with `=`, `+`, `-` or `@` are now handled so spreadsheet apps (Excel, Google Sheets) won't run them as formulas when you open an export.
- **Arrival reminders skip cancelled bookings.** Guests who cancelled no longer get a reminder before their check-in date.

## Changed

- **Nightly rate is now €135** (was €120). Price quotes use the new rate, so a 3-night stay is quoted at €405 instead of €360.

## Documentation

- The README now has setup instructions, including how to point the reminder job at your bookings file with the `BOOKINGS_FILE` setting.
