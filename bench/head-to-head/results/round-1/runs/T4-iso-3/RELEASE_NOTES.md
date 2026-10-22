# Release Notes

Changes since version 1.4.0.

## Fixes

- **Cancelled bookings no longer get a reminder.** The day-before reminder used to go out for bookings that guests had already cancelled. It now skips them.
- **Safer spreadsheet exports.** When you export bookings to CSV and open the file in a spreadsheet program, text that looks like a formula (for example, a guest name that starts with `=`) is no longer run. It now shows as plain text.

## Improvements

- **The bookings list now shows 50 bookings per page.** Long lists load faster. Use the page controls to see more bookings.

## Notes

- The bulk cancel button was tried during this period and then removed before release. It is not part of this version, so you will not see it on the bookings page.
