# stayhub release notes: version 1.4.1

Changes since version 1.4.0, for hotel owners who use stayhub. Released 2026-10-22.

## What changed for you

Version 1.4.1 fixes three problems and speeds up your bookings page. You do not need to do anything to get these changes.

- **Cancelled bookings get no reminder.** Guests with a cancelled booking no longer receive the day-before arrival email.
- **Safer spreadsheet exports.** Exported booking files no longer run formulas when you open them in a spreadsheet.
- **Faster bookings list.** The bookings page now shows 50 bookings at a time.
- **Totals rounded to cents.** The total for a stay is now rounded to two decimal places.

## Guests with cancelled bookings no longer get a reminder

Before this fix, stayhub could send the day-before reminder to a guest who had already cancelled. That could confuse the guest and lead to calls to your front desk. Now stayhub skips every cancelled booking when it sends reminders.

## Exported bookings are safe to open in a spreadsheet

A guest name that starts with `=`, `+`, `-` or `@` could be read as a formula when you opened the exported CSV file in a spreadsheet program. A formula can change or expose data in your spreadsheet. Now stayhub adds an apostrophe (`'`) before any such value.

You will see the apostrophe in the file for those values. For example, a guest entered as `=SUM(A1)` appears as `'=SUM(A1)`. The value shows as plain text and does not run.

## The bookings list loads in pages of 50

The bookings page now shows 50 bookings per page, which makes it load faster when you have many bookings. Page 1 shows the first 50. Go to the next page to see the rest.

## Stay totals are rounded to two decimal places

The total for a stay equals the nightly rate times the number of nights. stayhub now rounds that total to two decimal places. This stops long decimal amounts, such as 100.30000000000001, from appearing when a rate has cents.
