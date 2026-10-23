Changes since v1.4.0

You can now get an occupancy report, which shows how many of your available room-nights were booked as a whole number out of 100, so you can tell at a glance how full a month was. A month with no available room-nights shows 0.
Reminders can now go out at 9am in your hotel's local time instead of 9am UTC (the world time standard), so guests are no longer reminded at an odd hour.
Exporting the same list of bookings a second time now reuses the first result instead of rebuilding it.

Not in this release:
- Local-time reminders for every hotel: the reminder time only shifts once a hotel's time difference from UTC is supplied, and nothing sets it yet, so reminders still go out at 9am UTC until it is.
- A measured export speed-up: the export change was labelled faster, but no timing was taken, so no speed claim is made.
