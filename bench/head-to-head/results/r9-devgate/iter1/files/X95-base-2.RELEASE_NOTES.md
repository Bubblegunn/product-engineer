# Release Notes: Version 1.5.0

## Faster bookings list

The bookings list now shows 50 bookings per page instead of loading everything at once. In our test with 10,000 bookings, the list opened in about 38 ms, down from about 412 ms. Your own times will vary with your data and hardware.

## Reminders no longer go to cancelled bookings

Guests who cancelled their booking will no longer receive a reminder for it.

## Under the hood

We reworked how the CSV export builds its rows. Exports should look the same as before.
