Changes since v1.4.0 (commit f2f7690 to acf4a35)

You can now page through your bookings 50 at a time, so a long list no longer has to load all at once (measured on a list of 10,000 bookings, median of 5 runs on a laptop: 412 ms before, 38 ms after).
Guests with a cancelled booking no longer get a reminder; only bookings that are still on your calendar do.

Not in this release:
- Group bookings: added and then withdrawn within this release, so it is not available yet.
