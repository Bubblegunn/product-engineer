# StayHub 1.4.1 release notes

This update is for hotel owners who use StayHub. It covers every change since version 1.4.0.

## What changed for you

- **Safer CSV exports:** Guest names that start with `=`, `+`, `-` or `@` no longer run as formulas when you open an export in a spreadsheet. StayHub now adds a leading apostrophe (`'`) to those cells. You may see the apostrophe in front of such a name. Nothing else in the file changes.
- **No reminders for cancelled bookings:** The day-before reminder email no longer goes to guests whose booking you cancelled. Before this fix, those guests could still get a reminder.
- **Faster bookings list:** The bookings page now shows 50 bookings at a time instead of all of them. Large lists open more quickly. Use the pages to see older or later bookings.
- **Stay totals rounded to cents:** The total for a stay (nightly rate times nights) is now rounded to two decimal places. A total can no longer show a stray fraction of a cent.

## What you need to do

Nothing. All four changes apply as soon as you update.

If you share CSV exports with others, tell them an apostrophe in front of a name is intended.
