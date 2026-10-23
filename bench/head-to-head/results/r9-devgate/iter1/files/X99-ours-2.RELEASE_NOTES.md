Changes since v1.4.0 (commit 7d5bb4d to 6b07271)

You can now work out your occupancy (the share of your available room-nights that are booked, as a whole percentage), so you can see how full the hotel is. A period with no available nights counts as zero rather than failing.
Exporting the same list of bookings a second time now reuses the first result instead of rebuilding it.

Not in this release:
- Reminders at 9am in your own time zone: the reminder timing now understands a hotel's time zone, but nothing passes it yours yet, so reminders still go out at 9am UTC (the world-standard clock).
- A measured export speed-up: the export change reuses earlier results, but we did not measure it, so no speed figure is claimed.
