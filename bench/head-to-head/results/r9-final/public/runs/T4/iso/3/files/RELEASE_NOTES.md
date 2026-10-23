# What's new since version 1.4.0

## Fixes

- **Safer spreadsheet exports.** When you export bookings to CSV and open the file in Excel or Google Sheets, text that looks like a formula can no longer run. Guest-entered text, such as a name or a note, is now treated as plain text.
- **No more reminders for cancelled bookings.** The day-before reminder was also going out for bookings that had been cancelled. It now skips them.

## Improvements

- **A faster bookings list.** The list now shows 50 bookings per page instead of loading them all at once. Pages open faster, especially if you have a lot of bookings.
