Changes since v1.4.0 (commit b751f09 to d85083e: the 8 commits after the v1.4.0 tag)
StayHub 1.4.1, 22 October

Exported booking files (CSV, a spreadsheet-friendly list) can no longer run commands when you open them in Excel or Google Sheets, even if a guest typed something like "=..." as their name.
Guests with a cancelled booking no longer get the day-before reminder; only bookings that are still on are reminded.
The bookings list now shows 50 bookings at a time instead of all at once, so a long list is split into pages.
Stay totals are now rounded to two decimal places (cents), so a nightly rate times the number of nights no longer produces totals with stray extra digits.

Not in this release:
- Bulk cancel button on the bookings page: it was added and then removed again before release, so it is not available. The README still describes it, which is out of date.
