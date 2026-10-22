# StayHub 1.4.1 release notes

Version 1.4.1 is for hotel owners who use StayHub to manage bookings. It fixes a reminder problem and a spreadsheet safety problem, and it makes long booking lists easier to handle. It covers all changes since version 1.4.0.

## What you need to know

- **Cancelled guests no longer get reminders.** Update to stop sending "see you tomorrow" emails to guests who cancelled.
- **Spreadsheet exports are safer.** Update to protect your computer when you open an export.
- **The bookings list now shows 50 bookings per page.** You may need to move between pages to see all your bookings.
- **Stay totals are rounded to cents.** Totals now always show two decimal places.

## Fixes

### Cancelled bookings no longer get a day-before reminder

StayHub sends each guest a reminder email the day before they arrive. Until now, it also sent that email for bookings you had cancelled. It now skips every cancelled booking.

### CSV exports no longer run formulas in spreadsheets

A Comma-Separated Values (CSV) export is a file you open in a spreadsheet program such as Excel. If a guest name or other field started with `=`, `+`, `-` or `@`, the spreadsheet could treat it as a formula and run it. That could be used to attack your computer.

StayHub now puts an apostrophe (`'`) in front of any such value. The spreadsheet then shows the value as plain text.

You may see an apostrophe before a guest name that starts with one of those four characters. This is expected and keeps your file safe.

## Improvements

### The bookings list shows 50 bookings per page

The bookings list now loads one page of 50 bookings at a time. This keeps the page quick when you have many bookings. Page 1 shows the first 50. Move to the next page to see the rest.

### Stay totals are rounded to cents

The total for a stay is the nightly rate times the number of nights. StayHub now rounds that total to two decimal places. For example, a rate of 33.333 for 3 nights gives 100.00.

## Changes that did not ship

We built a bulk cancel button for the bookings page, then removed it before release. You cannot cancel several bookings in one step in this version.
