# stayhub 1.4.1 release notes

These notes tell hotel owners what changed since version 1.4.0 and what to do about it.

- **Version:** 1.4.1
- **Date:** 22 October 2026
- **Reader:** Hotel owners who use stayhub to manage bookings.

## What changed

This release fixes two problems, protects your spreadsheets, and speeds up your bookings list. You do not need to take any action.

## Cancelled bookings no longer get reminders

stayhub no longer sends the day-before reminder email for a cancelled booking. Before this fix, a guest who had cancelled could still receive a reminder to arrive.

## Exported spreadsheets are safer to open

When you export bookings to a CSV file, stayhub now protects cells that start with `=`, `+`, `-` or `@`. Spreadsheet programs can treat such text as a formula and run it. A guest name typed with one of these characters could have caused this.

stayhub now adds an apostrophe (`'`) at the start of those cells. The spreadsheet then shows them as plain text. You may see the apostrophe in front of a guest name or booking reference that starts with one of these characters.

## The bookings list loads 50 bookings at a time

The bookings list now returns 50 bookings per page, starting with page 1. Before, it loaded every booking at once, which was slow for hotels with many bookings.

## Stay totals are rounded to two decimal places

stayhub now rounds the total for a stay (nightly rate times number of nights) to two decimal places. This keeps totals to whole cents when a rate has more than two decimal places.

## Bulk cancel is not part of this release

We tested a button to cancel several bookings at once, then removed it before release. Version 1.4.1 does not include it. Cancel bookings one at a time.
