# Release Notes — Version 1.4.1

## What's improved

- **Faster bookings list.** The bookings page now shows 50 bookings at a time instead of loading everything at once, so it stays quick even when you have a long booking history.

## What's fixed

- **No more reminders for cancelled bookings.** The day-before reminder was still going out for bookings that had been cancelled. Guests who cancel will no longer receive it.
- **Safer CSV exports.** Exported booking files could contain text that spreadsheet programs such as Excel treat as a formula and run. Exports are now escaped so they open as plain data.
