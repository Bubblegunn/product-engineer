# What's new in StayHub 1.5.0

## Fixes

- **No more reminders for cancelled bookings.** Guests who cancelled will no longer receive a check-in reminder email.

## Improvements

- **Faster bookings list.** The bookings list now loads in pages of 50 instead of all at once. In our test with 10,000 bookings, it loaded in about 38 ms instead of 412 ms.
- **Slightly more efficient CSV export.** Exporting your bookings to CSV is built more efficiently. The file contents are unchanged.

## Good to know

- Reminders are sent by email the day before check-in.
