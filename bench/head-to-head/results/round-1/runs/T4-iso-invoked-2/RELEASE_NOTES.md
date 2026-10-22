# stayhub 1.4.1 release notes

This page tells hotel owners what changed since version 1.4.0 and what to do about it. It is written for owners who use stayhub to manage bookings. Released 2026-10-21.

## Overview

Version 1.4.1 fixes two problems and makes two smaller improvements. You do not need to change any settings.

- **Cancelled bookings:** Guests with a cancelled booking no longer get a reminder email.
- **Spreadsheet exports:** Exported files no longer run formulas when you open them.
- **Bookings list:** The list now shows 50 bookings per page.
- **Stay totals:** Totals now round to two decimal places.

## Fixes

### Guests with cancelled bookings no longer get a reminder

stayhub sends each guest a reminder email the day before they arrive. Until now, it also sent that email for bookings you had cancelled. It now skips cancelled bookings.

### Exported booking files are safer to open in a spreadsheet

A guest name can start with `=`, `+`, `-` or `@`. A spreadsheet program may treat such text as a formula and run it. This could let a harmful booking entry act on your computer when you open the export.

stayhub now adds an apostrophe (`'`) before any value that starts with one of these characters. The spreadsheet then shows the value as plain text. You may see this apostrophe in front of the affected guest names or other values in the file.

## Improvements

### The bookings list shows 50 bookings per page

The bookings list used to load every booking at once. It now returns 50 bookings per page, starting with page 1. This keeps the list quick when you have many bookings.

### Stay totals round to two decimal places

stayhub works out a stay total by multiplying the nightly rate by the number of nights. It now rounds the result to two decimal places. This stops long decimals, such as 100.00000000000001, from appearing in a total.
