# StayHub — What's New Since v1.4.0

## New

- **Occupancy report.** See how full your hotel is: the share of your available room-nights that are booked, shown as a whole percentage. A month with no bookings shows 0%.

## Improved

- **Guest reminders follow your local time.** Reminders are now timed for 9:00 AM on the day before check-in in your hotel's local time, rather than 9:00 AM UTC.
- **Faster repeat exports.** Exporting the same bookings to CSV again is now served from a cache instead of being rebuilt each time.

## Under the hood

Documentation for reports was added, and we made some internal cleanups and added tests around reports and reminders. These don't change how StayHub works for you.
