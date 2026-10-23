Changes since v1.4.0

Guests whose stay was called off no longer get a reminder email about it, so nobody is told to arrive for a booking that no longer exists.
The bookings list now shows 50 bookings at a time, so a long list no longer has to be drawn all at once. On a list of 10,000 bookings it took 38 ms instead of 412 ms (median of 5 runs on a laptop, timed before and after the change).
