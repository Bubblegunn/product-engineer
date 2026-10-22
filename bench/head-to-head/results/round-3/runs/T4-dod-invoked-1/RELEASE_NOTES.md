# StayHub 1.4.1 — Release Notes

What's new since 1.4.0.

## Safer CSV exports

Exported booking files could contain guest names or other text that Excel, Google Sheets and similar programs treat as a formula. A booking made with a name like `=HYPERLINK(...)` could run when you opened the file. Exports now neutralize any cell starting with `=`, `+`, `-` or `@`, so the text appears as written and nothing runs. We recommend updating before your next export.

## Faster bookings list

The bookings list now loads 50 bookings at a time instead of everything at once, so it opens faster for properties with a long booking history.

## Fixed: reminders for cancelled bookings

Guests who had cancelled were still getting the "see you tomorrow" email the day before their arrival date. Cancelled bookings no longer get reminders.
