# Release Notes — since v1.4.0

## Fixes

- **Safer CSV exports.** Exported booking files could contain text that Excel or Google Sheets would interpret as a formula. Exports now neutralize this, so opening a file never runs anything unexpected.
- **No more reminders for cancelled bookings.** The day-before reminder was also going out for bookings that had been cancelled. It now only goes to guests whose booking is still active.

## Improvements

- **Faster bookings list.** The bookings list now shows 50 bookings per page instead of loading everything at once, so it stays quick even with a lot of history.

## Notes

- The bulk cancel button was briefly added and then removed again before release, so it is not part of this version.
