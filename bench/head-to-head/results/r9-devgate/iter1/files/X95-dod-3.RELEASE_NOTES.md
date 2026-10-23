# StayHub 1.5.0

## Faster bookings list

The bookings list now loads one page at a time (50 bookings per page by default) instead of everything at once. In our test with 10,000 bookings, the list went from about 412 ms to about 38 ms. Hotels with a long booking history will notice this most.

## Fixed: no more reminders for cancelled bookings

Guests who cancelled were still getting a check-in reminder email. Cancelled bookings are now skipped.

## CSV export

We streamlined how the CSV export is put together. The file contents are unchanged.

## Documentation

The README now says when reminders go out: by email, the day before check-in.
