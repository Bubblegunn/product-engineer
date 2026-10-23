# StayHub 1.5.0 Release Notes

## Faster bookings list
The bookings list now loads one page at a time (50 bookings per page). In our test with 10,000 bookings, the list opened in about 38 ms, down from about 412 ms. Hotels with a long booking history should see the biggest improvement.

## Reminders no longer go out for cancelled bookings
Guests who cancelled their stay will no longer get a check-in reminder email.

## Reminder timing is now documented
We've added a short explanation to our documentation: reminders are sent by email the day before check-in.

## Behind the scenes
We made CSV export a little more efficient. The exported file looks the same as before.
