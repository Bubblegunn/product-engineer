# StayHub 1.5.0 Release Notes

## Fixed

- **No more reminders for cancelled bookings.** Guests who cancelled will no longer receive a check-in reminder email.

## Improved

- **A faster bookings list.** The list now shows bookings in pages of 50 instead of loading everything at once. In our test with 10,000 bookings, it loaded in about 38 ms, down from about 412 ms.
- **Slightly more efficient CSV export.** Exports are put together more efficiently. The file contents are the same as before.

## Good to know

- Reminders are sent by email the day before check-in.
