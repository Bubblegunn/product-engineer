Changes since v1.4.0 (commit bd97d27 to d85083e)

You can now browse your bookings 50 at a time, so a long list is split into pages instead of arriving all at once.
Guests with a cancelled booking no longer get the day-before reminder; only bookings that are still on are reminded.
Spreadsheets no longer run instructions hidden in exported booking data (a guest could type a spreadsheet formula into a text field), so opening an export in a spreadsheet program is safe.
The total for a stay (nightly rate times number of nights) is now rounded to two decimal places, so totals no longer show stray fractions of a cent.

Not in this release:
- Bulk cancel button on the bookings page: it was added and then taken back out, so it is not available. The setup guide still mentions it and is wrong on this point.
