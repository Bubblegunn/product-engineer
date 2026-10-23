# StayHub 1.5.0 Release Notes

## What's new

- **Faster bookings list.** The bookings list now shows one page of bookings at a time (50 per page). In our test with 10,000 bookings, the list loaded in about 38 ms instead of 412 ms.

## Fixes

- **No more reminders for cancelled bookings.** Guests who cancel will no longer get a check-in reminder email.

## Improvements

- **CSV export** now builds its rows more efficiently.
- **Reminders** are described in the documentation: they are sent by email the day before check-in.
