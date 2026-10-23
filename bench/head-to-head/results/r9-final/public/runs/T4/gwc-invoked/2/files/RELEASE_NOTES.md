# Release Notes: What's New Since v1.4.0

Version 1.4.1 and the updates after it.

## Security

- **Safer spreadsheet exports.** When you export bookings to CSV and open the file in Excel or Google Sheets, guest-entered text can no longer run as a spreadsheet formula. Your exports are now safe to open.

## Fixes

- **No more reminders for cancelled bookings.** The day-before reminder was also going out for bookings that had been cancelled. It now skips them, so guests who cancelled won't get a confusing message.

## Speed

- **Faster bookings list.** The bookings list now loads 50 bookings per page instead of everything at once. This is most noticeable if you have a lot of bookings.

## Under the hood

- Tidied up how prices are rounded internally. You shouldn't see any change.

## A note on bulk cancel

A "bulk cancel" button for the bookings page was added during this period and then removed before release. It is not part of this version.
