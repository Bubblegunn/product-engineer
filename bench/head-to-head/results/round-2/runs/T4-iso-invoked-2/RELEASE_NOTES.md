# StayHub 1.4.1 release notes

These notes are for hotel owners who use StayHub. They cover everything that changed since version 1.4.0.

## Overview

Version 1.4.1 makes four changes you may notice:

- Guests with cancelled bookings no longer get arrival reminders.
- Spreadsheets can no longer run harmful formulas hidden in an exported booking file.
- The bookings list now shows 50 bookings at a time.
- Stay totals are rounded to two decimal places.

You do not need to do anything to receive these changes.

## Cancelled bookings no longer get reminders

StayHub sends each guest a reminder email the day before they arrive. Before this version, guests whose booking you had cancelled could still get that email. Now StayHub skips cancelled bookings.

## Exported booking files are safer to open

A guest name that starts with `=`, `+`, `-` or `@` could act as a formula when you opened the exported CSV (comma-separated values) file in a spreadsheet program. A malicious guest could use this to run commands on your computer.

StayHub now adds a leading apostrophe (`'`) to any such value in the export. The spreadsheet then shows the text as plain text and does not run it. You may see the apostrophe in front of those values.

## The bookings list shows 50 bookings per page

The bookings list now loads 50 bookings at a time, so it opens faster when you have many bookings. Page 1 shows the first 50.

## Stay totals are rounded to two decimal places

StayHub now rounds the total for a stay, which is the nightly rate times the number of nights, to two decimal places. This removes stray fractions of a cent from totals.

## Not in this release

We tried a bulk cancel button on the bookings page, then removed it before release. Version 1.4.1 does not include it.
