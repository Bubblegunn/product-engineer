Changes since v1.4.0 (commit b751f09 to d85083e, 8 commits)
StayHub 1.4.1, 22 October

You can now open an exported bookings file in a spreadsheet without risk: a guest name that starts with `=`, `+`, `-` or `@` is shown as plain text instead of being run as a formula by the spreadsheet program.
Cancelled bookings no longer get the day-before reminder; only bookings that are still on will.
The bookings list now shows 50 bookings at a time instead of all of them at once, so a long list is split into pages.
Stay totals (nightly rate times number of nights) are now rounded to two decimal places, so a total is always a whole number of cents.

Not in this release:
- Bulk cancel button on the bookings page: it was added and then taken back out before release, so it is not available. The README mention of it was written for that button and does not apply to this release.
