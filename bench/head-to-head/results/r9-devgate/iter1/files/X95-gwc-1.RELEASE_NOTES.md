# StayHub 1.5.0 Release Notes

## Improvements

- **Faster bookings list.** The bookings list now shows one page at a time (50 bookings per page) instead of loading everything at once. In our test with 10,000 bookings, the list loaded in about 38 ms, down from about 412 ms. Your results will vary with your hardware and the size of your booking history.

## Fixes

- **No more reminders for cancelled bookings.** Guests whose bookings were cancelled will no longer get a check-in reminder.

## Good to know

- Reminders are sent by email the day before check-in.
