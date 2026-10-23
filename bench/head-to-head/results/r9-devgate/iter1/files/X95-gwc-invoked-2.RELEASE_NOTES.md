# StayHub 1.5.0 Release Notes

What's new since 1.4.0.

## Faster bookings list

The bookings list now loads in pages of 50 instead of all at once. In our test with 10,000 bookings, loading the list dropped from about 412 ms to about 38 ms. That test ran on a laptop, so times on your system may differ.

## No more reminders for cancelled bookings

Guests who cancel no longer get a check-in reminder email. Before, a cancelled booking could still trigger a reminder the day before its check-in date.

## Faster CSV export

Exporting your bookings to CSV now builds the file more efficiently. The file contents are the same as before.

## Reminder timing is now documented

Reminders go out by email the day before check-in. We've added this to the product documentation.

---

*Group bookings were added and then removed again during this period, so they are not part of 1.5.0.*
