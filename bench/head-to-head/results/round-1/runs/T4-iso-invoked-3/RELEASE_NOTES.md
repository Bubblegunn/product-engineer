# StayHub 1.4.1 release notes

These notes tell hotel owners what changed since version 1.4.0 and whether you need to do anything. Released 21 October 2026.

## Summary

Version 1.4.1 fixes a spreadsheet safety problem in exports and stops reminder emails going to guests who cancelled. The bookings page now loads 50 bookings at a time. Stay totals are now rounded to two decimal places. You do not need to take any action.

## What changed

### Exports are safer to open in a spreadsheet

Your CSV export now protects you from booking data that looks like a spreadsheet formula. Before this fix, a guest name starting with `=`, `+`, `-` or `@` could run as a formula when you opened the file in Excel or Google Sheets.

Such values now appear as plain text, with a `'` in front. You may see this mark before a guest name or other value that starts with one of those four characters.

### Cancelled bookings no longer get a reminder

StayHub sends each guest a reminder email the day before they arrive. Before this fix, guests who had cancelled could still receive that email. Cancelled bookings are now skipped.

### The bookings list loads in pages of 50

The bookings page now shows 50 bookings at a time instead of every booking at once. This keeps the page quick when you have many bookings. Page 1 shows the first 50.

### Stay totals are rounded to two decimal places

The total for a stay (nightly rate times number of nights) now rounds to two decimal places. For example, a rate that produced a total with many trailing digits now shows a normal price amount.

## Known issue

**Bulk cancel is not available.** We tried a bulk cancel button on the bookings page during this cycle and removed it before release. Our README still describes it by mistake. Cancel bookings one at a time for now. We will correct the README.
