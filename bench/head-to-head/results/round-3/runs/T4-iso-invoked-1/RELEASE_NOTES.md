# stayhub 1.4.1 release notes

These notes tell hotel owners what changed since version 1.4.0 and whether you need to do anything.

**Version:** 1.4.1 (changes since 1.4.0)
**Reader:** Hotel owners and managers who use stayhub.

## Overview

You do not need to do anything to get these changes. Version 1.4.1 contains four changes:

- **Safer CSV export:** Spreadsheets no longer run formulas hidden in exported booking data.
- **Fewer wrong reminders:** Guests with cancelled bookings no longer get a day-before reminder email.
- **Faster bookings list:** The list shows 50 bookings per page.
- **Rounded totals:** Stay totals now round to two decimal places.

## Safer CSV export

Exported CSV files no longer let a spreadsheet run formulas that someone typed into a booking.

A guest name or ID that starts with `=`, `+`, `-` or `@` could be read by a spreadsheet program as a formula. Now stayhub puts an apostrophe (`'`) in front of any such value. The spreadsheet then shows the text as written.

You will see the apostrophe in the file if a value starts with one of those four characters.

## Cancelled bookings no longer get reminders

The day-before reminder email now skips cancelled bookings. Before this fix, a guest who had cancelled could still receive a reminder to arrive the next day.

## The bookings list shows 50 bookings per page

The bookings list now loads 50 bookings at a time instead of all of them at once. Hotels with many bookings should see the list open faster.

## Stay totals round to two decimal places

The total for a stay (nightly rate times number of nights) now rounds to two decimal places. For example, a rate of 33.333 for 3 nights used to give 99.999 and now gives 100.00. Rounding stops fractions of a cent from showing up in totals.

## Bulk cancel is not part of this release

Bulk cancel, which lets you cancel several bookings in one step, is not available. We added it during development and then removed it before release.
