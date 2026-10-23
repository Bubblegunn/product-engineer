Changes since v1.4.0 (commit f2f7690 to acf4a35)

You can now page through your bookings 50 at a time, so a long list no longer has to load all at once. On a list of 10,000 bookings, showing the list went from 412 ms to 38 ms (median of 5 runs on a laptop, before and after the change).
Guests whose booking is cancelled no longer get a reminder email; only bookings that are still on are reminded.

Not in this release:
- Group bookings: added during this period, then taken back out before release, so they are not available.
