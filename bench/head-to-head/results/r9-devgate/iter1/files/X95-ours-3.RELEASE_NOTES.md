Changes since v1.4.0 (commit f2f7690 to acf4a35)

Guests whose booking was cancelled no longer get a reminder, so you stop sending "see you tomorrow" messages to people who are not coming.
The bookings list now shows 50 bookings at a time, so a long list no longer has to be drawn all at once (measured on a list of 10,000 bookings on a laptop, median of 5 runs: 412 ms before, 38 ms after).

Not in this release:
- Group bookings: added and then taken back out during this period, so they are not available.
