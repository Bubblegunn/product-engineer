# StayHub 1.5.0 Release Notes

## Improvements

- **Faster bookings list.** The bookings list now loads in pages of 50 bookings instead of all at once. In our test with 10,000 bookings, the list loaded in about 38 ms, down from about 412 ms.

## Fixes

- **No more reminders for cancelled bookings.** Guests whose bookings were cancelled will no longer receive a check-in reminder email.

## Good to know

- Reminders are sent by email the day before check-in.
