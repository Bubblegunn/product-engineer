# Release Notes

## What's new since 1.4.0

### Fixes
- **No more reminders for cancelled bookings.** The day-before reminder email is now only sent for active bookings. Guests who cancelled will no longer get a "see you tomorrow" message.
- **Safer CSV exports.** Guest names or other fields that begin with `=`, `+`, `-` or `@` are now marked so Excel, Google Sheets and similar programs treat them as plain text instead of running them as formulas. Those cells will show a leading `'` in the exported file.

### Improvements
- **Faster bookings list.** The bookings list now loads 50 bookings at a time instead of everything at once, so it stays quick as your booking history grows.
