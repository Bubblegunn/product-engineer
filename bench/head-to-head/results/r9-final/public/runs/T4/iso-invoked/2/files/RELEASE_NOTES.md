# stayhub 1.4.1 release notes

This page tells hotel owners what changed since version 1.4.0 and what to do about it. Version 1.4.1, October 2026.

## Overview

Version 1.4.1 fixes two problems and makes two improvements. You do not need to take any action. One change affects your exported files: see "Check names that start with a symbol" below.

- **Reminders:** Guests with cancelled bookings no longer get the day-before email.
- **Spreadsheet export:** Exported files can no longer run formulas that someone typed into a booking.
- **Bookings list:** The list now shows 50 bookings at a time.
- **Stay totals:** Totals are rounded to two decimal places.

## Fixes

### Cancelled bookings no longer get a reminder

Before this fix, stayhub sent the day-before reminder to guests who had already cancelled. Now it skips every cancelled booking. Guests with active bookings still get their reminder as before.

### Spreadsheet export is safer

A booking field such as a guest name could start with `=`, `+`, `-` or `@`. A spreadsheet program may treat that text as a formula and run it when you open the file. This could be used to attack you or your staff.

Now stayhub puts an apostrophe (`'`) in front of any exported value that starts with one of those four characters. The spreadsheet then shows the text and does not run it.

#### Check names that start with a symbol

If a guest name or other value starts with `=`, `+`, `-` or `@`, your exported file will show the apostrophe before it. Your bookings in stayhub are not changed.

## Improvements

### The bookings list shows 50 bookings at a time

The bookings list used to load every booking at once, which slows down as your history grows. It now shows 50 bookings per page, starting with page 1.

### Stay totals are rounded to two decimal places

The total for a stay is the nightly rate times the number of nights. stayhub now rounds that total to two decimal places, so you do not see amounts with stray extra digits.

## Not included in this release

We tried a bulk cancel button for the bookings page and then removed it before release. You cannot cancel several bookings in one step in version 1.4.1. Cancel bookings one at a time.
