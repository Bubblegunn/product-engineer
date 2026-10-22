# Release Notes: Version 1.4.1

## What's new

- **Faster bookings list.** The bookings page now shows 50 bookings at a time instead of loading them all at once. The page opens faster, especially if you have a lot of bookings.

## Fixes

- **No more reminders for cancelled bookings.** The day-before reminder was also going out for bookings that had been cancelled. It now skips them, so guests who cancelled won't get a reminder.
- **Safer CSV exports.** If a guest name or other field started with a character such as `=`, `+`, `-` or `@`, Excel or Google Sheets could treat it as a formula and run it. Exports now mark these entries as plain text, so they show as written and are not run.
