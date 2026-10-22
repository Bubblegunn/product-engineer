# Release Notes: version 1.4.1

## Safer CSV exports
Exported booking files could contain text that a spreadsheet program such as Excel treats as a formula and runs when you open the file. Exports now neutralize this, so opening them in a spreadsheet is safe. Your data looks the same as before.

## Fix: no more reminders for cancelled bookings
The day-before reminder was also going out for bookings that had been cancelled. Cancelled bookings are now skipped, so guests no longer get reminders for stays they cancelled.

## Faster bookings list
The bookings list now shows 50 bookings per page instead of loading everything at once. It opens faster, especially if you have a lot of bookings.
