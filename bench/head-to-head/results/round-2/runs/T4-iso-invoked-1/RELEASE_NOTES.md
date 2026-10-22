# StayHub 1.4.1 release notes

This update stops reminders going to guests who cancelled. It also makes spreadsheet exports safer and the bookings page shorter. It covers all changes since version 1.4.0.

## What changed for you

- **Cancelled guests no longer get reminders.** The day-before reminder email now skips every cancelled booking. Before, a guest who had cancelled could still receive "see you tomorrow".
- **Safer spreadsheet exports.** If a guest name or other field starts with `=`, `+`, `-` or `@`, Excel and similar tools could run it as a formula. The CSV export now adds a leading `'` to such values, so the spreadsheet shows them as plain text. You may see this mark in front of those values.
- **Bookings list shows 50 bookings per page.** The list now loads one page at a time, so it opens faster when you have many bookings. Page 1 shows the first 50.
- **Stay totals round to the cent.** The total for a stay (nightly rate times nights) is now rounded to two decimal places. This avoids totals such as 99.99999999999999.

## What did not change

- **Bulk cancel is not available.** We tried a button to cancel several bookings at once and removed it before release. Cancel bookings one at a time.

## What you need to do

Nothing. You do not need to change any settings.

If you use exported CSV files in another system, check that it accepts the leading `'` on values that start with `=`, `+`, `-` or `@`.
