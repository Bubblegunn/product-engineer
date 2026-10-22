# StayHub 1.4.1 — Release Notes

What's new since 1.4.0.

## Fixes

- **No more reminders for cancelled bookings.** The day-before arrival reminder email was still being sent to guests whose booking you had cancelled. Cancelled bookings are now skipped.
- **Safer spreadsheet exports.** If a guest name (or other field) began with `=`, `+`, `-` or `@`, Excel or Google Sheets could treat it as a formula when you opened the exported CSV. These values are now exported as plain text, so your spreadsheet will not run them.

## Improvements

- **Faster bookings list.** The bookings list now loads 50 bookings per page instead of everything at once, which keeps it quick as your booking history grows.

## Good to know

- Bulk cancel (cancelling several bookings in one step) is **not** part of this release. It was added during development and then withdrawn before release.
- Behind-the-scenes housekeeping to price calculations (no change to the prices you see).
