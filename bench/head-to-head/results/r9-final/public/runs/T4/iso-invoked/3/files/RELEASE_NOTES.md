# stayhub 1.4.1 release notes

This page tells hotel owners what changed since version 1.4.0 and what to do about it. Version 1.4.1, 23 October 2026.

## What changed in 1.4.1

Update to 1.4.1 to get a safer guest export, correct reminders and faster booking lists. You need to take no action. Check the note on the bookings list below if you have more than 50 bookings.

## Safer guest export

Exported CSV files (spreadsheet files) are now safe to open in Excel or Google Sheets. A guest could type a name that starts with `=`, `+`, `-` or `@`. A spreadsheet can read such text as a formula and run it. Stayhub now adds a leading apostrophe to these values, so the spreadsheet shows them as plain text.

If a guest name in your export now begins with an apostrophe, this change caused it.

## Reminders no longer go to cancelled bookings

Stayhub sends each guest a reminder email the day before they arrive. Before this fix, guests with a cancelled booking could still receive that email. Cancelled bookings now get no reminder.

## Faster bookings list

The bookings list now loads 50 bookings at a time instead of all at once. Large lists open faster. Bookings beyond the first 50 appear on the following pages.

## Nightly totals are rounded to the cent

The total for a stay (nightly rate times number of nights) is now rounded to two decimal places. This removes odd amounts such as 100.30000000000001. Your rates and the amounts you charge do not change.

## Bulk cancel is not part of this release

We built a button to cancel several bookings at once, then removed it before release. You cannot use it in 1.4.1. Cancel bookings one at a time.
